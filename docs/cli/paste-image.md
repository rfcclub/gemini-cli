# Paste images

gemini-vesta detects base64-encoded image data pasted from your terminal and
saves it to disk, then inserts an `@path` reference into the chatbox. On
submit, the model receives the image as an `inlineData` part alongside your
prompt — exactly like dropping a file into the chat.

This complements **Ctrl+V / right-click image paste** (which reads from your
OS clipboard via `clipboardHasImage` / `saveClipboardImage`). The terminal
paste flow works without a GUI clipboard and is the recommended path when
copying an image from a remote session, a screenshot tool that emits
base64, or any text channel that carries image data.

## Supported formats

| Format | Detection signal                                                      | MIME type    | File extension |
| ------ | --------------------------------------------------------------------- | ------------ | -------------- |
| PNG    | base64 starts with `iVBORw0KGgo` (PNG signature `89 50 4E 47 …`)       | `image/png`  | `.png`         |
| JPEG   | base64 starts with `/9j/` (SOI marker `FF D8 FF`)                     | `image/jpeg` | `.jpg`         |
| WebP   | base64 starts with `UklGR` (RIFF header + `WEBP` at offset 8)         | `image/webp` | `.webp`        |
| GIF    | `data:image/gif;base64,…` data URI                                     | `image/gif`  | `.gif`         |

Both `data:image/<fmt>;base64,<…>` data URIs and raw base64 (no prefix) are
accepted. Detection requires the decoded bytes to start with valid magic
bytes for the claimed format — random base64 that decodes to non-image
bytes is rejected.

## How it works

1. **Detect.** The bracketed-paste handler calls `looksLikeImageData()`
   on the raw paste sequence (no truncation, no stripping). If it returns
   `{ mimeType, data }`, we treat the paste as an image.
2. **Persist.** `saveImageData()` writes the decoded buffer to
   `<projectTempDir>/images/paste-<unix-ms>-<random4>.<ext>` using a
   synchronous atomic write + re-read magic-byte verification. Mismatched
   bytes are deleted and the paste falls through to text.
3. **Insert.** A relative `@<path>` reference is inserted at the cursor
   via `buffer.replaceRangeByOffset`. Adjacent whitespace is added if the
   cursor is not already surrounded by spaces or newlines.
4. **Cleanup.** A fire-and-forget `cleanupOldClipboardImages()` call
   removes `paste-*` (and `clipboard-*`) images older than one hour.

## Limits

- **Minimum length:** 100 characters of paste content (heuristic floor
  to avoid false positives on short strings that happen to start with
  `iVBORw0KGgo`).
- **Maximum size:** 10 MB of paste content (memory safety). Anything
  larger falls through to regular text paste.
- **Validation:** Bytes must match the claimed format's magic signature.
  Mismatched data is discarded — no garbage files in your temp dir.

## Examples

### Data URI from a web tool

```
> paste this:
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=
```

Result: chatbox shows `@<projectTempDir>/images/paste-1782663814380-a7f3.png `.
On submit, the model receives a `inlineData` part with the PNG bytes.

### Raw base64 from `base64 -i screenshot.png`

```
> cat screenshot.png | base64
iVBORw0KGgoAA…  (very long)
```

Paste the entire output. Same behavior as the data URI case.

### Plain text (fall-through)

```
> hello world
```

`looksLikeImageData()` returns `null` for non-base64 / non-magic content.
The paste is treated as regular text and flows through `buffer.handleInput`.

## Comparison: paste-image vs Ctrl+V

| Flow                          | Source                    | Trigger             | Persistence             |
| ----------------------------- | ------------------------- | ------------------- | ----------------------- |
| Paste-image (terminal)        | Bracketed paste sequence  | Auto-detect         | `paste-*` files         |
| Ctrl+V / right-click          | OS clipboard              | Explicit keypress   | `clipboard-*` files     |
| `@path` syntax                | User-typed path           | Submit-time resolve | Already on filesystem  |

Both flows share the same `@<path>` → `ReadManyFilesTool` → `inlineData`
downstream pipeline. Both flows also share `cleanupOldClipboardImages()`
for TTL-based cleanup (1 hour).

## Troubleshooting

- **Nothing happened when I pasted.** Check that the base64 actually
  decodes to a valid image. `looksLikeImageData()` silently rejects
  mismatched bytes to avoid polluting your temp dir.
- **My 50 MB screenshot wasn't detected.** Anything over 10 MB is
  intentionally rejected to protect memory. Use Ctrl+V / right-click
  for large images instead.
- **`0c/0c0c` appearing in the chat.** This was a known issue where
  Form Feed bytes (`\x0C`) from bracketed paste of binary data leaked
  into the text buffer. Now handled upstream by `stripUnsafeCharacters()`
  on the text-paste path — you should no longer see it.

## Source files

- `packages/cli/src/ui/utils/clipboardUtils.ts` — `looksLikeImageData`,
  `saveImageData`, `cleanupOldClipboardImages`.
- `packages/cli/src/ui/components/InputPrompt.tsx` — paste branch
  orchestration.
- `packages/cli/src/ui/utils/clipboardUtils.test.ts` — unit tests.
- `packages/cli/src/ui/components/InputPrompt.test.tsx` — integration
  tests under `paste-image flow` describe block.