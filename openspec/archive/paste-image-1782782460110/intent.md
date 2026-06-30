# Intent: paste-image

## Raw Request

> implement paste-image support đi em ... mlem mlem mlem, cho intent, spec,
> design ,task

## Problem

Trong gemini-vesta CLI, khi user **paste image từ terminal** (ví dụ: copy ảnh từ
Preview → paste vào InputPrompt trong terminal iTerm2/WezTerm), kết quả hiện tại
là **text rác** chèn vào input box, không phải image attachment.

So với:

- **Ctrl+V** (đã work): detect clipboard image qua
  `clipboardUtils.clipboardHasImage()` + `saveClipboardImage()` → insert
  `@<path>` text → submit-time resolve thành `inlineData` part
- **Right-click paste** (đã work): same flow as Ctrl+V
- **`@./image.png`** syntax (đã work): explicit path → atCommandProcessor →
  ReadManyFilesTool → inlineData

**Gap duy nhất**: Terminal paste event (`\x1b[200~...\x1b[201~` bracketed paste,
hoặc OSC 52) mang binary/base64 image data nhưng `InputPrompt.tsx` xử lý như
text thuần.

**User impact**:

- Không thể paste ảnh screenshot nhanh từ terminal multiplexer
- Phải save ảnh ra file trước, rồi mới gõ `@path/to/image.png` thủ công
- Trải nghiệm "paste nhanh" bị broken

## Desired Outcome

Sau khi hoàn tất change này:

- ✅ Khi user paste image binary/base64 vào InputPrompt (terminal bracketed
  paste), em **tự động detect** + save to disk + insert `@<relativePath>` text
  vào buffer (mirror `handleClipboardPaste` flow).
- ✅ Khi user submit, image được resolve thành `inlineData` part qua `@`-command
  pipeline hiện có (zero changes to submit-time).
- ✅ Detect được các format: PNG, JPEG, WebP, GIF, base64 với `data:image/...`
  prefix, base64 với magic bytes (`iVBORw0KGgo` for PNG, `/9j/` for JPEG, etc).
- ✅ Không false positive trên text paste (regular text phải pass qua nguyên xi
  như cũ).
- ✅ Có visual feedback tạm thời: "📎 image.png (142KB)" hiện trong buffer ngay
  sau khi detect.

## Users / Actors

- **Primary**: Thoor (anh) — operator của gemini-vesta, paste ảnh nhanh từ
  terminal.
- **Secondary**: Vesta runtime — UI handler + clipboard utilities.
- **Tertiary**: Downstream model — receives `inlineData` part, processes as
  image input.

## Current Context

**Source**: `/Users/thoor/work/gemini-vesta/` (monorepo TypeScript, Node 20+,
React/Ink CLI).

**Infrastructure sẵn có (reused, không cần modify):**

- `packages/cli/src/ui/utils/clipboardUtils.ts`:
  - `IMAGE_EXTENSIONS` (line 28): whitelist
  - `clipboardHasImage()` (line 155): check clipboard có image không
  - `saveClipboardImage(targetDir)` (line 290): write PNG to
    `<projectTemp>/images/clipboard-<ts>.png`
  - `cleanupOldClipboardImages()` (line 360): remove files >1h old
- `packages/cli/src/ui/components/InputPrompt.tsx`:
  - `handleClipboardPaste` (line 519-577): Ctrl+V + right-click handler — saves
    image, inserts `@<path>` text
  - `key.name === 'paste'` branch (line ~1297): bracketed paste entry point —
    currently does `buffer.handleInput(key)` blindly
- `packages/cli/src/ui/contexts/KeypressContext.tsx`:
  - `bufferPaste` (line 305-360): catches `\x1b[200~...\x1b[201~`, OSC 52, emits
    `{ name: 'paste', sequence: ... }` key
- `packages/core/src/utils/fileUtils.ts`:
  - `processSingleFileContent` (line 363): converts image file →
    `{ inlineData: { data: base64, mimeType } }`
- `packages/cli/src/ui/hooks/atCommandProcessor.ts`:
  - `parseAllAtCommands` (line 62): extracts `@<path>` substrings
  - `readLocalFiles` (line 474): invokes ReadManyFilesTool → PartListUnion
- `packages/cli/src/ui/hooks/useGeminiStream.ts`:
  - `submitQuery(query: PartListUnion, ...)` (line 1584): accepts PartListUnion
    directly
  - `isAtCommand` branch (line 1020-1041): processes `@<path>` via
    atCommandProcessor

**Tested patterns:**

- 21 files already use `inlineData` in monorepo
- `image/png`, `image/jpeg`, `image/webp`, `image/heic`, `image/heif` MIME types
  supported
- Existing tests: `useApprovalModeIndicator.test.ts` (700+ lines) — pattern to
  follow for hook tests

## Proposed Direction

1. **Add helper `saveImageData(buffer, mimeType, targetDir)` to
   `clipboardUtils.ts`**:
   - Accepts already-decoded Buffer + MIME type (or detects from magic bytes)
   - Writes to `<projectTemp>/images/paste-<timestamp>.<ext>`
   - Returns relative path or null
   - Reuses `getProjectClipboardImagesDir` + `cleanupOldClipboardImages`

2. **Add detector
   `looksLikeImageData(sequence: string): { mimeType, data } | null`**:
   - Strip leading/trailing whitespace
   - Check prefixes:
     - `data:image/png;base64,<...>` → PNG
     - `data:image/jpeg;base64,<...>` → JPEG
     - `data:image/webp;base64,<...>` → WebP
     - `iVBORw0KGgo...` (raw base64 PNG header)
     - `/9j/...` (raw base64 JPEG header)
     - `UklGR...` (raw base64 WebP header)
   - Check buffer size: if `sequence.length < 100` or `> 10MB`, return null
     (likely text)
   - If valid: decode base64, return `{ mimeType, data: Buffer }`
   - Else: return null

3. **Inject at `InputPrompt.tsx` paste branch**:
   - Before `buffer.handleInput(key)`, call `looksLikeImageData(key.sequence)`
   - If image: call
     `saveImageData(data, mimeType, getProjectClipboardImagesDir())` → get
     relative path
   - Insert `@<relativePath>` at cursor (mirror lines 542-560 from
     `handleClipboardPaste`)
   - Show "📎 image.png (142KB)" hint temporarily
   - Set a small ref/state
     `lastPastedImage: { path, sizeBytes, mimeType } | null` for visual feedback
   - Return true (consume event, don't pass to buffer)

4. **Cleanup behavior**: existing `cleanupOldClipboardImages` already runs on
   every paste — extends to clean paste-images too (just call same function on
   paste-image success).

5. **Test strategy**:
   - Unit test `looksLikeImageData` with positive/negative cases
   - Unit test `saveImageData` with valid Buffer
   - Integration: simulate paste key event → assert buffer has `@<path>` text
   - E2E (optional): mock terminal paste of real PNG, verify inlineData flow

## Scope

- Modify `packages/cli/src/ui/utils/clipboardUtils.ts`: add `saveImageData` +
  `looksLikeImageData`
- Modify `packages/cli/src/components/InputPrompt.tsx`: inject detection in
  paste branch
- Add `clipboardUtils.test.ts` cases for new functions
- Add `InputPrompt.test.tsx` cases for paste-image flow
- Optional: integration test that submits after paste-image and asserts
  inlineData part generated
- Documentation: `docs/cli/paste-image.md` with format examples

## Non-Goals

- ❌ Không modify KeypressContext (paste detection happens at InputPrompt level,
  not keypress level)
- ❌ Không thêm support cho paste image qua pipe/stdin (chỉ terminal paste
  event)
- ❌ Không support paste video/audio (chỉ image formats: PNG, JPEG, WebP, GIF)
- ❌ Không thêm UI modal preview image trước khi submit (chỉ hint text ngắn)
- ❌ Không thay đổi `@<path>` resolution pipeline (reuse as-is)
- ❌ Không touch gemini API/model integration

## Constraints

- **Backward compat**: Regular text paste (letters, code, JSON) phải pass qua
  nguyên xi — không false positive nào được phép.
- **Size limits**: image < 10MB để tránh OOM. Quá lớn → fall through to text
  paste + warn user.
- **Security**: chỉ chấp nhận image MIME types whitelist. Không save raw binary
  không rõ nguồn gốc.
- **No regression**: existing `handleClipboardPaste` (Ctrl+V) phải work y
  nguyên. existing `buffer.handleInput(key)` phải work cho non-image paste.
- **Test isolation**: tests không touch real clipboard. Mock `fs.writeFile` +
  use synthetic PNG bytes.
- **LoomKit compliance**: TDD strict. Red → Green → Refactor cho mỗi unit.

## Success Criteria

- [ ] Khi paste base64 PNG/JPEG/WebP vào InputPrompt → image saved to
      `<projectTemp>/images/paste-<ts>.{png,jpg,webp}` + buffer shows `@<path>`
      text
- [ ] Khi paste plain text (length 10-10000 chars) → buffer inserts text nguyên
      xi, không save file
- [ ] Khi paste short text (< 100 chars) mà có prefix "data:image" — vẫn detect
      đúng là image
- [ ] Khi submit sau paste-image → request to model chứa `inlineData` part với
      đúng base64 + mimeType
- [ ] `cleanupOldClipboardImages` dọn cả paste-images cũ (>1h)
- [ ] Tất cả existing tests vẫn pass (inputPrompt tests, clipboardUtils tests)
- [ ] Typecheck green, lint clean
- [ ] Manual test: copy ảnh vào clipboard, paste vào gemini-vesta, gõ "what's in
      this image?" → submit → model responds based on image

## Risks

- **Risk**: False positive — text starting with `iVBORw0KGgo` được treat như
  image → save file rác
  - **Mitigation**: Require length > 100 chars AND prefix match. If prefix
    match + length < 100, treat as text.
  - **Mitigation 2**: Test với long-text-no-image cases (Lorem ipsum 5000
    chars).

- **Risk**: Memory pressure với large base64 paste (50MB+)
  - **Mitigation**: Hard cap 10MB. If > 10MB → fall through to text + warn
    "Image too large (>10MB), not pasted as image".

- **Risk**: Magic byte detection false match trên random base64 data
  - **Mitigation**: Validate base64 decode succeeds + first 8 bytes match magic
    pattern. Use Node's `Buffer.from(seq, 'base64')` + check magic offset.

- **Risk**: Race condition với concurrent paste events
  - **Mitigation**: Use `Date.now()` for unique filename + atomic writeFileSync
    (no partial writes visible).

- **Risk**: User paste binary garbage (terminal sent wrong data) → file written
  không phải image
  - **Mitigation**: After write, re-read first 8 bytes and verify magic. If
    mismatch, delete file + fall through to text.

## Ambiguities

### Blocking

- ❓ **Display format**: should the buffer show `@path/to/paste-12345.png`
  (current handleClipboardPaste behavior) or a nicer hint like
  `📎 paste-12345.png (142KB)`?
  - Em đề xuất: dùng plain `@<path>` (consistent với existing flow, model can
    resolve). Hint chỉ là toast notification tạm thời ở góc, không thay thế text
    trong buffer.
  - Lý do: downstream `@`-command resolution expect raw `@<path>`. If we insert
    fancy text, submit-time breaks.

### Non-Blocking

- Cleanup interval: 1h có phù hợp? (currently hardcoded in
  `cleanupOldClipboardImages`)
- Should we show toast hint or just silently insert? — em đề xuất silent
  insert + log to debug channel, không cần toast UI.
- Should we support drag-and-drop image trên macOS (not just text paths)? —
  defer, separate change.

## Assumptions

- **Assumption**: `paste-image` chỉ áp dụng khi paste event mang binary/base64
  image data. Regular text paste (length > 100, no image prefix) flow cũ vẫn
  work.
- **Assumption**: User thường paste ảnh < 5MB (screenshots). 10MB cap đủ
  generous.
- **Assumption**: 80% infrastructure đã có sẵn, scope của change này là inject
  detection logic + wire existing helpers, không phải build from scratch.
- **Assumption**: Terminal em đang dùng (iTerm2/WezTerm/Termius) emit bracketed
  paste sequences correctly. macOS Terminal.app also supports.

## Spec Seeds

- WHEN user pastes base64 PNG data (prefix `iVBORw0KGgo` + length > 100) AND
  image < 10MB THEN image is saved to disk AND buffer has `@<relativePath>` text
- WHEN user pastes plain text (no image prefix, any length) THEN buffer inserts
  text nguyên xi, NO file is saved
- WHEN user pastes `data:image/png;base64,<...>` URI THEN strip prefix, decode,
  save as PNG, insert `@<path>`
- WHEN user pastes image > 10MB THEN fall through to text + warn "Image too
  large, not pasted as image"
- WHEN user submits after paste-image THEN the request to model includes
  `inlineData` part with correct mimeType + base64
- WHEN paste-image succeeds AND file write fails THEN fall through to text + log
  error
- WHEN `cleanupOldClipboardImages` runs THEN it removes paste-images older than
  1 hour alongside clipboard-images
- WHEN binary paste is detected as image but file write fails THEN user sees
  warning + no file pollution in temp dir

## Intent Approval

Status: DRAFT — chờ anh duyệt để chuyển sang Spec.
