## Architecture

**Approach: Surgical injection at InputPrompt paste branch.** Reuse 90% of
existing infrastructure (`handleClipboardPaste`, `clipboardUtils`,
`atCommandProcessor`, `ReadManyFilesTool`). Only add 2 new helper functions to
`clipboardUtils.ts` + 1 detection branch in `InputPrompt.tsx`.

**Layer breakdown:**

1. **Detection layer** (`clipboardUtils.ts`): pure functions, no side effects.
   Determines if a paste sequence is image data.
2. **Persistence layer** (`clipboardUtils.ts`): writes decoded buffer to disk,
   returns relative path.
3. **Wiring layer** (`InputPrompt.tsx`): orchestrates detection → save → buffer
   insertion. Mirrors `handleClipboardPaste` flow.
4. **Downstream layer** (existing, unchanged): `@<path>` resolution →
   `ReadManyFilesTool` → `inlineData` part.

**Why not detect at KeypressContext level (lower):**

- More invasive (changes Key type contract)
- Harder to gracefully fall through to text paste on detection failure
- InputPrompt-level detection is the same layer as `handleClipboardPaste`
  (consistent)

## Components

### New: `looksLikeImageData(sequence: string): { mimeType: string; data: Buffer } | null`

- **Location**: `packages/cli/src/ui/utils/clipboardUtils.ts`
- **Inputs**: `sequence: string` — raw paste sequence from keypress event
- **Outputs**: `{ mimeType, data }` on success, `null` on non-image input
- **Logic**:
  1. If `sequence.length > 10_000_000` (10MB) → return null
  2. If `sequence.length < 100` → return null (too short to be meaningful image)
  3. Strip leading/trailing whitespace
  4. Detect format:
     - `data:image/<fmt>;base64,` prefix → strip prefix, decode
     - `iVBORw0KGgo` → raw PNG
     - `/9j/` → raw JPEG
     - `UklGR` → raw WebP
  5. If no match → return null
  6. Decode base64 → Buffer
  7. Verify magic bytes (first 8 bytes)
  8. If magic mismatch → return null
  9. Return `{ mimeType, data }`

### New: `saveImageData(data: Buffer, mimeType: string, targetDir: string): Promise<string | null>`

- **Location**: `packages/cli/src/ui/utils/clipboardUtils.ts`
- **Inputs**:
  - `data: Buffer` — decoded image bytes
  - `mimeType: string` — image MIME type (e.g., `"image/png"`)
  - `targetDir: string` — absolute path to images directory
- **Outputs**: relative path string on success, `null` on failure
- **Logic**:
  1. Validate `mimeType` against `IMAGE_EXTENSIONS` whitelist → return null if
     not
  2. Map MIME type to extension (`image/png` → `.png`, `image/jpeg` → `.jpg`,
     etc.)
  3. Generate filename: `paste-<Date.now()>-<random4>.${ext}`
  4. Construct full path: `<targetDir>/<filename>`
  5. `fs.writeFileSync(path, data)` (atomic sync write)
  6. Re-read first 8 bytes, verify magic → delete + return null if mismatch
  7. Compute relative path from project root using `path.relative()`
  8. Return relative path
  9. Catch any thrown error → log + return null

### Modified: `InputPrompt.tsx` paste branch

- **Location**: `packages/cli/src/ui/components/InputPrompt.tsx` ~line 1297
- **Logic** (in `key.name === 'paste'` block, BEFORE `buffer.handleInput(key)`):
  ```ts
  if (key.name === 'paste') {
    const detected = looksLikeImageData(key.sequence);
    if (detected) {
      const targetDir = getProjectClipboardImagesDir(); // existing helper
      const relativePath = await saveImageData(
        detected.data,
        detected.mimeType,
        targetDir,
      );
      if (relativePath) {
        // Insert ' @<path> ' at cursor (mirror handleClipboardPaste lines 542-560)
        const insertText = ` @${relativePath} `;
        buffer.replaceRangeByOffset(cursorOffset, cursorOffset, insertText);
        return true; // consume event
      }
      // Fall through to text paste if save failed
    }
    return buffer.handleInput(key); // existing text paste path
  }
  ```
- **New state**: optional
  `lastPastedImage: { path, sizeBytes, mimeType } | null` for debug log

### Modified: `cleanupOldClipboardImages` (existing function)

- **Location**: `packages/cli/src/ui/utils/clipboardUtils.ts` line 360
- **Change**: extend glob pattern from `clipboard-*.{png,jpg,...}` to also
  include `paste-*.{png,jpg,...}`
- **No signature change** — fully backward compat

## Data Model

### Types (new in `clipboardUtils.ts`)

```ts
export interface ImageData {
  mimeType: string; // e.g., "image/png", "image/jpeg", "image/webp"
  data: Buffer; // decoded image bytes
}
```

### File naming convention

- `paste-<unix-ms>-<4-char-random>.<ext>`
- Example: `paste-1782663814380-a7f3.png`
- Stored in `<projectTemp>/images/`
- Random suffix prevents race conditions on rapid pastes

### Config (no new schema)

- Uses existing `Storage.getProjectTempDir()` for target dir
- No new settings.json entries needed

## Test Strategy

| Scenario ID                    | Test File                | Type        |
| ------------------------------ | ------------------------ | ----------- |
| detect-data-uri-png            | `clipboardUtils.test.ts` | unit        |
| detect-data-uri-jpeg           | `clipboardUtils.test.ts` | unit        |
| detect-data-uri-webp           | `clipboardUtils.test.ts` | unit        |
| detect-raw-base64-png          | `clipboardUtils.test.ts` | unit        |
| reject-plain-text              | `clipboardUtils.test.ts` | unit        |
| reject-short-data-uri          | `clipboardUtils.test.ts` | unit        |
| reject-oversized-paste         | `clipboardUtils.test.ts` | unit        |
| reject-lorem-ipsum             | `clipboardUtils.test.ts` | unit        |
| save-valid-png                 | `clipboardUtils.test.ts` | unit        |
| save-valid-jpeg-with-jpg-ext   | `clipboardUtils.test.ts` | unit        |
| reject-non-image-mime          | `clipboardUtils.test.ts` | unit        |
| reject-when-write-fails        | `clipboardUtils.test.ts` | unit        |
| terminal-paste-base64-png      | `InputPrompt.test.tsx`   | integration |
| terminal-paste-plain-text      | `InputPrompt.test.tsx`   | integration |
| terminal-paste-long-text       | `InputPrompt.test.tsx`   | integration |
| terminal-paste-data-uri        | `InputPrompt.test.tsx`   | integration |
| oversized-paste-falls-through  | `InputPrompt.test.tsx`   | integration |
| detection-fails-midway         | `InputPrompt.test.tsx`   | integration |
| submit-with-pasted-image       | `InputPrompt.test.tsx`   | integration |
| cleanup-removes-old-paste      | `clipboardUtils.test.ts` | unit        |
| cleanup-preserves-recent-paste | `clipboardUtils.test.ts` | unit        |
| ctrl-v-still-works             | `InputPrompt.test.tsx`   | regression  |
| right-click-still-works        | `InputPrompt.test.tsx`   | regression  |

**Total**: 23 test cases. Mix of new unit tests (clipboardUtils) + integration
tests (InputPrompt) + regression (existing paste flows).

## Dependencies

**None.** Uses Node.js built-in:

- `Buffer.from(seq, 'base64')` for base64 decoding
- `fs.writeFileSync` / `fs.readFileSync` for I/O
- `path.relative` for path computation
- `Date.now()` for timestamp
- `Math.random().toString(36)` for random suffix

No new npm packages. No new imports beyond Node built-ins.

## Migration

**No breaking changes.**

- All new functions are additive (`looksLikeImageData`, `saveImageData`)
- `cleanupOldClipboardImages` extends existing glob but signature unchanged
- `InputPrompt.tsx` modification is purely additive (new branch, fall-through to
  existing on failure)
- All existing tests must pass without modification
- `@<path>` resolution pipeline unchanged
- Ctrl+V / right-click paste unchanged
- Regular text paste unchanged (the existing `buffer.handleInput(key)` path runs
  as before for non-image paste)

**Rollback plan**: if regression detected, single git revert of the
InputPrompt.tsx change + clipboardUtils additions reverts to pre-change state.
No data migration needed.
