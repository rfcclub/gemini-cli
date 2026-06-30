## ADDED Requirements

### Requirement: Image Data Detection in Paste Sequence

The system SHALL provide
`looksLikeImageData(sequence: string): { mimeType: string; data: Buffer } | null`
that detects base64-encoded image data in a paste event sequence. The function
MUST return null for any non-image input to avoid false positives.

#### Scenario: detect data URI PNG

- **WHEN** `sequence` is `"data:image/png;base64,iVBORw0KGgo..."` with length >
  100
- **THEN** `looksLikeImageData(sequence)` returns object where
  `mimeType = "image/png"` AND `data` is a non-empty Buffer
- **AND** the first 8 bytes of `data` match the PNG magic signature
  (`89 50 4E 47 0D 0A 1A 0A`).

#### Scenario: detect data URI JPEG

- **WHEN** `sequence` is `"data:image/jpeg;base64,/9j/4AAQ..."` with length >
  100
- **THEN** `looksLikeImageData(sequence)` returns object where
  `mimeType = "image/jpeg"` AND `data` starts with `FF D8 FF` (JPEG magic).

#### Scenario: detect data URI WebP

- **WHEN** `sequence` is `"data:image/webp;base64,UklGRiQA..."` with length >
  100
- **THEN** `looksLikeImageData(sequence)` returns object where
  `mimeType = "image/webp"` AND `data` starts with `RIFF...WEBP`.

#### Scenario: detect raw base64 PNG without data URI prefix

- **WHEN** `sequence` starts with `"iVBORw0KGgo..."` (raw base64 PNG header) AND
  length > 100
- **THEN** `looksLikeImageData(sequence)` returns object where
  `mimeType = "image/png"` AND `data` is a valid Buffer.

#### Scenario: reject plain text

- **WHEN** `sequence` is `"Hello world this is a normal message"` (no image
  prefix, length < 10000)
- **THEN** `looksLikeImageData(sequence)` returns `null`.

#### Scenario: reject short data URI

- **WHEN** `sequence` is `"data:image/png;base64,xx"` (length < 100)
- **THEN** `looksLikeImageData(sequence)` returns `null` (too short, likely text
  fragment).

#### Scenario: reject oversized paste

- **WHEN** `sequence` length > 10_000_000 (10MB)
- **THEN** `looksLikeImageData(sequence)` returns `null` (size cap to prevent
  OOM).

#### Scenario: reject Lorem ipsum

- **WHEN** `sequence` is 5000 chars of lorem ipsum text (no image prefix)
- **THEN** `looksLikeImageData(sequence)` returns `null`.

### Requirement: Image Data Save to Disk

The system SHALL provide
`saveImageData(data: Buffer, mimeType: string, targetDir: string): Promise<string | null>`
that writes the decoded image buffer to disk and returns the relative path
(relative to project root). Files MUST be named with a timestamp to avoid
collisions and placed in the project's clipboard images directory.

#### Scenario: save valid PNG

- **WHEN** `saveImageData` is called with a valid PNG Buffer,
  `mimeType = "image/png"`, and a target directory
- **THEN** a file is created at `<targetDir>/paste-<timestamp>.png`
- **AND** the file's first 8 bytes match the PNG magic signature (re-read
  verification)
- **AND** the returned string is the relative path from project root (e.g.,
  `.gemini-vesta/tmp/.../images/paste-<ts>.png`).

#### Scenario: save valid JPEG with .jpg extension

- **WHEN** `saveImageData` is called with a valid JPEG Buffer,
  `mimeType = "image/jpeg"`
- **THEN** the file is created with `.jpg` extension (not `.jpeg`).

#### Scenario: reject non-image MIME type

- **WHEN** `saveImageData` is called with `mimeType = "text/plain"`
- **THEN** the function returns `null` (whitelist enforcement)
- **AND** no file is created.

#### Scenario: reject when write fails

- **WHEN** `saveImageData` is called but `fs.writeFileSync` throws (e.g.,
  permission denied)
- **THEN** the function returns `null`
- **AND** no partial file remains in the target directory.

### Requirement: Paste Branch Image Detection

When the InputPrompt receives a paste event (`key.name === 'paste'`), the system
SHALL first attempt to detect image data in the paste sequence before falling
through to the text paste flow. Image data MUST be saved to disk and replaced
with an `@<path>` reference in the input buffer.

#### Scenario: terminal paste of base64 PNG

- **WHEN** user pastes a base64 PNG (length 50000, prefix `iVBORw0KGgo`) into
  InputPrompt
- **THEN** the image is saved to `<projectTemp>/images/paste-<ts>.png`
- **AND** the input buffer has `@<relativePath>` text inserted at the cursor
  position
- **AND** no raw base64 text appears in the buffer.

#### Scenario: terminal paste of plain text

- **WHEN** user pastes the string `"function foo() { return 42; }"` into
  InputPrompt
- **THEN** the text is inserted into the buffer as-is
- **AND** no file is created.

#### Scenario: terminal paste of long plain text

- **WHEN** user pastes 8000 chars of Lorem ipsum text into InputPrompt
- **THEN** the text is inserted into the buffer as-is
- **AND** no file is created.

#### Scenario: terminal paste of data URI

- **WHEN** user pastes `"data:image/png;base64,iVBORw0KGgo..."` (length 50000)
  into InputPrompt
- **THEN** the `data:image/png;base64,` prefix is stripped
- **AND** the remaining base64 is decoded and saved as PNG
- **AND** the input buffer has `@<relativePath>` text.

#### Scenario: oversized image paste falls through to text

- **WHEN** user pastes a 15MB base64 image (exceeds 10MB cap)
- **THEN** no image is saved
- **AND** the raw text is inserted into the buffer as-is (user can manually
  save)
- **AND** a warning is logged:
  `WARN: Image too large (>10MB), not pasted as image.`

#### Scenario: image detection fails midway (write error)

- **WHEN** user pastes valid base64 PNG AND `fs.writeFileSync` throws
- **THEN** no `@<path>` text is inserted
- **AND** the raw text is inserted into the buffer as-is
- **AND** an error is logged with the underlying error message.

### Requirement: Submit-Time Image Resolution

When the user submits a query containing `@<path>` references to image files,
the existing `@`-command processor SHALL resolve those paths into `inlineData`
parts sent to the model. This MUST work for both `@path` references inserted via
terminal paste and explicit `@path` references typed by the user.

#### Scenario: submit query with pasted image

- **WHEN** user submits `"What's in this image? @<path-to-pasted-png>"`
- **THEN** the atCommandProcessor extracts the path
- **AND** ReadManyFilesTool reads the file
- **AND** `processSingleFileContent` returns
  `{ inlineData: { data: base64, mimeType: "image/png" } }`
- **AND** the request sent to the model includes this inlineData part.

### Requirement: Cleanup Extends to Paste Images

The existing `cleanupOldClipboardImages` function SHALL also remove paste-images
older than 1 hour. Files in the project images directory that match the
`paste-<timestamp>.*` naming pattern MUST be cleaned up alongside
`clipboard-<timestamp>.*` files.

#### Scenario: cleanup removes old paste-images

- **WHEN** `cleanupOldClipboardImages` runs AND a file `paste-12345.png` exists
  with mtime > 1 hour ago
- **THEN** the file is deleted.

#### Scenario: cleanup preserves recent paste-images

- **WHEN** `cleanupOldClipboardImages` runs AND a file `paste-67890.png` exists
  with mtime < 1 hour ago
- **THEN** the file is preserved.

### Requirement: No Regression on Existing Paste Flows

Existing paste flows (Ctrl+V via `handleClipboardPaste`, right-click paste,
regular text paste) MUST continue to work unchanged after this change.

#### Scenario: Ctrl+V paste still works

- **WHEN** user presses Ctrl+V with an image in OS clipboard
- **THEN** `handleClipboardPaste` runs (unchanged behavior)
- **AND** the image is saved to `<projectTemp>/images/clipboard-<ts>.png`
- **AND** the buffer has `@<path>` text.

#### Scenario: Right-click paste still works

- **WHEN** user right-clicks to paste with an image in OS clipboard
- **THEN** the right-click handler invokes `handleClipboardPaste` (unchanged)
- **AND** behavior is identical to Ctrl+V.
