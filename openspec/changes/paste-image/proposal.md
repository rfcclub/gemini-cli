## Why

Trong gemini-vesta CLI, khi user paste ảnh vào InputPrompt từ terminal
(bracketed paste mang binary/base64 data), kết quả hiện tại là text rác. 80%
infrastructure đã có sẵn (Ctrl+V paste image, `@<path>` syntax), chỉ thiếu
detection ở terminal paste event. Change này inject detection vào InputPrompt
paste branch, mirror `handleClipboardPaste` flow.

## What Changes

- **New**: `looksLikeImageData(sequence: string): { mimeType, data } | null`
  trong `clipboardUtils.ts` — detect PNG/JPEG/WebP base64 trong paste sequence.
- **New**: `saveImageData(buffer, mimeType, targetDir): Promise<string | null>`
  trong `clipboardUtils.ts` — write decoded image to
  `<projectTemp>/images/paste-<ts>.<ext>`.
- **Modify**: `packages/cli/src/ui/components/InputPrompt.tsx` — inject
  detection ở `key.name === 'paste'` branch (~line 1297). Trước khi
  `buffer.handleInput(key)`, kiểm tra image data; nếu có, save + insert
  `@<path>` thay vì insert text.
- **New**: Reuse existing `getProjectClipboardImagesDir` +
  `cleanupOldClipboardImages` (extend to clean paste-images cũ).
- **New**: Unit tests cho `looksLikeImageData` + `saveImageData` trong
  `clipboardUtils.test.ts`.
- **New**: Test cases cho paste-image flow trong `InputPrompt.test.tsx`.
- **New**: Documentation `docs/cli/paste-image.md` với format examples +
  troubleshooting.

## Capabilities

### New Capabilities

- `paste-image`: Detect base64 image data in terminal paste events, save to
  disk, insert `@<path>` reference for downstream model resolution. Spec tại
  `specs/paste-image/spec.md`.

### Modified Capabilities

- None. Existing `@<path>` resolution, Ctrl+V paste, right-click paste đều giữ
  nguyên.

## Impact

**Affected code:**

- `packages/cli/src/ui/utils/clipboardUtils.ts` — thêm 2 functions, 0
  modifications to existing
- `packages/cli/src/ui/components/InputPrompt.tsx` — 1 new branch trong
  `key.name === 'paste'` block (~15 lines added)
- `packages/cli/src/ui/utils/clipboardUtils.test.ts` — extend tests
- `packages/cli/src/ui/components/InputPrompt.test.tsx` — extend tests

**APIs:**

- Public exports mới: `looksLikeImageData`, `saveImageData` từ
  `clipboardUtils.ts`
- No new dependencies (uses Node's built-in `Buffer.from(seq, 'base64')`)

**Backward compat:**

- Existing text paste (regular chars) → pass through nguyên xi (no detection)
- Existing Ctrl+V / right-click paste → unchanged
- Existing `@<path>` syntax → unchanged
- Existing ReadManyFilesTool image resolution → unchanged
- Existing inlineData part generation → unchanged

**Performance:**

- `looksLikeImageData` chạy O(1) prefix check + O(n) base64 decode trên paste
  event. < 50ms cho typical screenshot.
- Hard cap 10MB để tránh OOM.
- File write sync qua `fs.writeFileSync` (atomic), < 100ms typical.

**Security:**

- Chỉ chấp nhận image MIME types whitelist (PNG, JPEG, WebP, GIF).
- Magic byte validation sau write (re-read first 8 bytes, verify match).
- Không save raw binary không rõ nguồn gốc.
- Files written to projectTemp (user-owned dir), không escape to /tmp hay shared
  locations.
