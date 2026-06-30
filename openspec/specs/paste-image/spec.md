# paste-image Specification

## Requirements

### Requirement: Image Data Detection in Paste Sequence

The system SHALL provide
`looksLikeImageData(sequence: string): { mimeType: string; data: Buffer } | null`
that detects base64-encoded image data in a paste event sequence. The function
MUST return null for any non-image input to avoid false positives.

#### Scenario: detect data URI PNG

- **WHEN** `sequence` is `"data:image/png;base64,iVBORw0KGgo..."` with length >
- **THEN** `looksLikeImageData(sequence)` returns object where
- **THEN** the first 8 bytes of `data` match the PNG magic signature

#### Scenario: detect data URI JPEG

- **WHEN** `sequence` is `"data:image/jpeg;base64,/9j/4AAQ..."` with length >
- **THEN** `looksLikeImageData(sequence)` returns object where

#### Scenario: detect data URI WebP

- **WHEN** `sequence` is `"data:image/webp;base64,UklGRiQA..."` with length >
- **THEN** `looksLikeImageData(sequence)` returns object where

#### Scenario: detect raw base64 PNG without data URI prefix

- **WHEN** `sequence` starts with `"iVBORw0KGgo..."` (raw base64 PNG header) AND
- **THEN** `looksLikeImageData(sequence)` returns object where

#### Scenario: reject plain text

- **WHEN** `sequence` is `"Hello world this is a normal message"` (no image
- **THEN** `looksLikeImageData(sequence)` returns `null`.

#### Scenario: reject short data URI

- **WHEN** `sequence` is `"data:image/png;base64,xx"` (length < 100)
- **THEN** `looksLikeImageData(sequence)` returns `null` (too short, likely text

#### Scenario: reject oversized paste

- **WHEN** `sequence` length > 10_000_000 (10MB)
- **THEN** `looksLikeImageData(sequence)` returns `null` (size cap to prevent

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
- **THEN** a file is created at `<targetDir>/paste-<timestamp>.png`
- **THEN** the file's first 8 bytes match the PNG magic signature (re-read
- **THEN** the returned string is the relative path from project root (e.g.,

#### Scenario: save valid JPEG with .jpg extension

- **WHEN** `saveImageData` is called with a valid JPEG Buffer,
- **THEN** the file is created with `.jpg` extension (not `.jpeg`).

#### Scenario: reject non-image MIME type

- **WHEN** `saveImageData` is called with `mimeType = "text/plain"`
- **THEN** the function returns `null` (whitelist enforcement)
- **THEN** no file is created.

#### Scenario: reject when write fails

- **WHEN** `saveImageData` is called but `fs.writeFileSync` throws (e.g.,
- **THEN** the function returns `null`
- **THEN** no partial file remains in the target directory.

### Requirement: Paste Branch Image Detection

When the InputPrompt receives a paste event (`key.name === 'paste'`), the system
SHALL first attempt to detect image data in the paste sequence before falling
through to the text paste flow. Image data MUST be saved to disk and replaced
with an `@<path>` reference in the input buffer.

#### Scenario: terminal paste of base64 PNG

- **WHEN** user pastes a base64 PNG (length 50000, prefix `iVBORw0KGgo`) into
- **THEN** the image is saved to `<projectTemp>/images/paste-<ts>.png`
- **THEN** the input buffer has `@<relativePath>` text inserted at the cursor
- **THEN** no raw base64 text appears in the buffer.

#### Scenario: terminal paste of plain text

- **WHEN** user pastes the string `"function foo() { return 42; }"` into
- **THEN** the text is inserted into the buffer as-is
- **THEN** no file is created.

#### Scenario: terminal paste of long plain text

- **WHEN** user pastes 8000 chars of Lorem ipsum text into InputPrompt
- **THEN** the text is inserted into the buffer as-is
- **THEN** no file is created.

#### Scenario: terminal paste of data URI

- **WHEN** user pastes `"data:image/png;base64,iVBORw0KGgo..."` (length 50000)
- **THEN** the `data:image/png;base64,` prefix is stripped
- **THEN** the remaining base64 is decoded and saved as PNG
- **THEN** the input buffer has `@<relativePath>` text.

#### Scenario: oversized image paste falls through to text

- **WHEN** user pastes a 15MB base64 image (exceeds 10MB cap)
- **THEN** no image is saved
- **THEN** the raw text is inserted into the buffer as-is (user can manually
- **THEN** a warning is logged:

#### Scenario: image detection fails midway (write error)

- **WHEN** user pastes valid base64 PNG AND `fs.writeFileSync` throws
- **THEN** no `@<path>` text is inserted
- **THEN** the raw text is inserted into the buffer as-is
- **THEN** an error is logged with the underlying error message.

### Requirement: Submit-Time Image Resolution

When the user submits a query containing `@<path>` references to image files,
the existing `@`-command processor SHALL resolve those paths into `inlineData`
parts sent to the model. This MUST work for both `@path` references inserted via
terminal paste and explicit `@path` references typed by the user.

#### Scenario: submit query with pasted image

- **WHEN** user submits `"What's in this image? @<path-to-pasted-png>"`
- **THEN** the atCommandProcessor extracts the path
- **THEN** ReadManyFilesTool reads the file
- **THEN** `processSingleFileContent` returns
- **THEN** the request sent to the model includes this inlineData part.

### Requirement: Cleanup Extends to Paste Images

The existing `cleanupOldClipboardImages` function SHALL also remove paste-images
older than 1 hour. Files in the project images directory that match the
`paste-<timestamp>.*` naming pattern MUST be cleaned up alongside
`clipboard-<timestamp>.*` files.

#### Scenario: cleanup removes old paste-images

- **WHEN** `cleanupOldClipboardImages` runs AND a file `paste-12345.png` exists
- **THEN** the file is deleted.

#### Scenario: cleanup preserves recent paste-images

- **WHEN** `cleanupOldClipboardImages` runs AND a file `paste-67890.png` exists
- **THEN** the file is preserved.

### Requirement: No Regression on Existing Paste Flows

Existing paste flows (Ctrl+V via `handleClipboardPaste`, right-click paste,
regular text paste) MUST continue to work unchanged after this change.

#### Scenario: Ctrl+V paste still works

- **WHEN** user presses Ctrl+V with an image in OS clipboard
- **THEN** `handleClipboardPaste` runs (unchanged behavior)
- **THEN** the image is saved to `<projectTemp>/images/clipboard-<ts>.png`
- **THEN** the buffer has `@<path>` text.

#### Scenario: Right-click paste still works

- **WHEN** user right-clicks to paste with an image in OS clipboard
- **THEN** the right-click handler invokes `handleClipboardPaste` (unchanged)
- **THEN** behavior is identical to Ctrl+V.
