# Implementation Plan: paste-image

## Preparation

- [x] Review spec scenarios for paste-image (6 requirements, 23 scenarios)
- [x] Review design.md test strategy
- [x] Survey InputPrompt paste branch line ~1297
- [x] Survey clipboardUtils.ts (existing functions to reuse)

## Tasks

### Task 1: `looksLikeImageData` detector

**Files:**

- Modify: `packages/cli/src/ui/utils/clipboardUtils.ts` (add new export)
- Test: `packages/cli/src/ui/utils/clipboardUtils.test.ts` (add new describe
  block)

- [ ] **Step 1: Write failing tests (8 scenarios)**

  ```ts
  describe('looksLikeImageData', () => {
    it('detects data URI PNG', () => { ... });
    it('detects data URI JPEG', () => { ... });
    it('detects data URI WebP', () => { ... });
    it('detects raw base64 PNG', () => { ... });
    it('rejects plain text', () => { ... });
    it('rejects short data URI (< 100 chars)', () => { ... });
    it('rejects oversized paste (> 10MB)', () => { ... });
    it('rejects Lorem ipsum (5000 chars no prefix)', () => { ... });
  });
  ```

  Run: `npm test -w @google/gemini-cli -- src/ui/utils/clipboardUtils.test.ts`
  Expected: FAIL (function doesn't exist)

- [ ] **Step 2: Implement `looksLikeImageData`**

  ```ts
  export function looksLikeImageData(
    sequence: string,
  ): { mimeType: string; data: Buffer } | null {
    if (sequence.length > 10_000_000 || sequence.length < 100) return null;
    const trimmed = sequence.trim();

    // Check data URI prefix
    const dataUriMatch = trimmed.match(
      /^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i,
    );
    if (dataUriMatch) {
      const mimeType =
        dataUriMatch[1] === 'jpg' ? 'image/jpeg' : `image/${dataUriMatch[1]}`;
      const buffer = Buffer.from(dataUriMatch[2], 'base64');
      if (verifyMagicBytes(buffer, mimeType)) return { mimeType, data: buffer };
      return null;
    }

    // Check raw base64 by magic prefix
    if (trimmed.startsWith('iVBORw0KGgo')) {
      const buffer = Buffer.from(trimmed, 'base64');
      if (verifyMagicBytes(buffer, 'image/png'))
        return { mimeType: 'image/png', data: buffer };
    }
    if (trimmed.startsWith('/9j/')) {
      const buffer = Buffer.from(trimmed, 'base64');
      if (verifyMagicBytes(buffer, 'image/jpeg'))
        return { mimeType: 'image/jpeg', data: buffer };
    }
    if (trimmed.startsWith('UklGR')) {
      const buffer = Buffer.from(trimmed, 'base64');
      if (verifyMagicBytes(buffer, 'image/webp'))
        return { mimeType: 'image/webp', data: buffer };
    }

    return null;
  }

  function verifyMagicBytes(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 8) return false;
    if (mimeType === 'image/png') {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    }
    if (mimeType === 'image/jpeg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (mimeType === 'image/webp') {
      return (
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
      );
    }
    return false;
  }
  ```

  Run: same test command Expected: PASS

- [ ] **Step 3: Typecheck + lint**
  ```bash
  npm run typecheck -w @google/gemini-cli && npm run lint -w @google/gemini-cli -- src/ui/utils/clipboardUtils.ts
  ```
  Expected: green

### Task 2: `saveImageData` persistence

**Files:**

- Modify: `packages/cli/src/ui/utils/clipboardUtils.ts` (add new export)
- Test: `packages/cli/src/ui/utils/clipboardUtils.test.ts` (extend describe)

- [ ] **Step 1: Write failing tests (4 scenarios)**

  ```ts
  describe('saveImageData', () => {
    it('saves valid PNG and returns relative path', () => { ... });
    it('uses .jpg extension for image/jpeg', () => { ... });
    it('rejects non-image MIME type', () => { ... });
    it('returns null when write fails', () => { ... });
  });
  ```

  Run: same test command Expected: FAIL

- [ ] **Step 2: Implement `saveImageData`**

  ```ts
  const MIME_EXT_MAP: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };

  export async function saveImageData(
    data: Buffer,
    mimeType: string,
    targetDir: string,
  ): Promise<string | null> {
    const ext = MIME_EXT_MAP[mimeType];
    if (!ext) return null;

    try {
      const filename = `paste-${Date.now()}-${Math.random().toString(36).slice(2, 6)}${ext}`;
      const fullPath = path.join(targetDir, filename);
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(fullPath, data);

      // Magic byte verification
      const reRead = fs.readFileSync(fullPath);
      if (!verifyMagicBytes(reRead, mimeType)) {
        fs.unlinkSync(fullPath);
        return null;
      }

      return filename; // return relative path
    } catch (e) {
      debugLogger.warn(`Failed to save image data: ${(e as Error).message}`);
      return null;
    }
  }
  ```

  Run: same test command Expected: PASS

- [ ] **Step 3: Typecheck + lint** Same as Task 1 Step 3

### Task 3: Cleanup extension to paste-images

**Files:**

- Modify: `packages/cli/src/ui/utils/clipboardUtils.ts` (existing
  `cleanupOldClipboardImages` function)
- Test: `packages/cli/src/ui/utils/clipboardUtils.test.ts` (extend existing
  tests)

- [ ] **Step 1: Write failing tests (2 scenarios)**

  ```ts
  describe('cleanupOldClipboardImages with paste-images', () => {
    it('removes old paste-*.png files', () => { ... });
    it('preserves recent paste-*.png files', () => { ... });
  });
  ```

- [ ] **Step 2: Update glob pattern**

  ```ts
  // Old: const files = fs.readdirSync(targetDir).filter(f => f.startsWith('clipboard-')...);
  // New:
  const files = fs
    .readdirSync(targetDir)
    .filter((f) => f.startsWith('clipboard-') || f.startsWith('paste-'));
  ```

- [ ] **Step 3: Verify existing clipboard cleanup tests still pass**

### Task 4: InputPrompt paste branch detection

**Files:**

- Modify: `packages/cli/src/ui/components/InputPrompt.tsx` (paste branch
  ~line 1297)
- Test: `packages/cli/src/ui/components/InputPrompt.test.tsx` (extend with 5
  scenarios)

- [ ] **Step 1: Write failing tests (5 scenarios)**

  ```ts
  describe('InputPrompt paste-image flow', () => {
    it('terminal paste of base64 PNG saves and inserts @path', async () => { ... });
    it('terminal paste of plain text inserts as text', async () => { ... });
    it('terminal paste of long text inserts as text', async () => { ... });
    it('terminal paste of data URI strips prefix and saves', async () => { ... });
    it('oversized image falls through to text', async () => { ... });
  });
  ```

  Run:
  `npm test -w @google/gemini-cli -- src/ui/components/InputPrompt.test.tsx`
  Expected: FAIL

- [ ] **Step 2: Inject detection branch**

  ```ts
  // In InputPrompt.tsx, locate the paste handler
  if (key.name === 'paste' && key.sequence) {
    const detected = looksLikeImageData(key.sequence);
    if (detected) {
      const targetDir = getProjectClipboardImagesDir();
      const relativePath = await saveImageData(
        detected.data,
        detected.mimeType,
        targetDir,
      );
      if (relativePath) {
        const insertText = ` @${relativePath} `;
        // Use buffer.insert or replaceRangeByOffset based on existing API
        buffer.insert(insertText, { paste: true });
        cleanupOldClipboardImages(targetDir); // cleans both clipboard + paste
        return true;
      }
      debugLogger.warn('Failed to save pasted image, falling through to text');
    }
    return buffer.handleInput(key);
  }
  ```

  Run: same test command Expected: PASS

- [ ] **Step 3: Verify no regression — existing paste tests pass**

### Task 5: Documentation

**Files:**

- Create: `docs/cli/paste-image.md`

- [ ] **Step 1: Write docs**
  - Overview of paste-image feature
  - Format examples (data URI, raw base64)
  - Size limit + behavior
  - Troubleshooting
  - Reference to `handleClipboardPaste` (Ctrl+V) for comparison

- [ ] **Step 2: Add link from `docs/cli/index.md` or `docs/cli/features.md`**

## Verification

- [ ] All 23 spec scenarios have passing tests
- [ ] `.loomkit-verify.json` shows coverage = 100%
- [ ] Existing tests for `clipboardUtils.ts` pass (no regression)
- [ ] Existing tests for `InputPrompt.tsx` pass (no regression)
- [ ] Existing tests for `atCommandProcessor.ts` pass (no regression)
- [ ] `npm run typecheck` green
- [ ] `npm run lint` clean
- [ ] `npm test -w @google/gemini-cli` all green
- [ ] Manual E2E: copy image to clipboard, paste into gemini-vesta, submit query
      → model receives inlineData

## Risk Mitigation Checklist

- [ ] False positive: tests cover lorem ipsum 5000 chars, plain text 100+ chars
- [ ] Size cap: tests cover >10MB paste
- [ ] Magic byte validation: tests cover random base64 that decodes but isn't
      image
- [ ] Write failure: tests cover permission-denied scenario
- [ ] Backward compat: existing handleClipboardPaste (Ctrl+V) tests pass
- [ ] Race condition: random suffix in filename prevents collisions

## Rollback Plan

Single git revert of changes to:

- `clipboardUtils.ts` (3 functions added)
- `InputPrompt.tsx` (~15 lines added)
- New test files

Reverts cleanly. No data migration needed.
