# Design: Athanor Auto-Boot Injection

## 1. Architecture Map
This feature modifies `packages/core/src/prompts/promptProvider.ts` to include a new class, `AthanorWeaver`. This class is responsible for loading and formatting the Athanor markdown files.

**Dependencies:**
- `node:fs` and `node:path` for synchronous file reading.
- Environment variables (`process.env.VESTA_ATHANOR_DIR`) and user home directory fallback for path resolution.

## 2. API / Interfaces

```typescript
// New Interface (Internal to promptProvider.ts or a separate file if it grows)
interface IAthanorWeaver {
  /** Retrieves the Athanor content, reading from disk if not cached. */
  getAthanorContext(): string;
  /** Force re-read from disk (useful for tests or reload commands). */
  refresh(): void;
}

// Inside promptProvider.ts
export function getCoreSystemPrompt(options: SystemPromptOptions): string {
    // ... existing logic ...
    const athanorContent = athanorWeaver.getAthanorContext();
    if (athanorContent) {
        basePrompt += `\n\n<athanor_core>\n${athanorContent}\n</athanor_core>`;
    }
    return basePrompt;
}
```

## 3. Storage & Data Models
- No new persistent storage needed. State is purely in-memory caching of the read string.
- Content is simple concatenated markdown.

## 4. State Management
- `AthanorWeaver` will be a singleton or instantiated once per `PromptProvider` lifecycle.
- It holds a single string `cachedContent: string | null`.
- On `getAthanorContext()`, if `cachedContent === null`, it performs synchronous disk reads, populates the cache, and returns it.

## 5. Security & Privacy
- **Path Traversal:** The path is strictly constructed relative to the detected Athanor directory. It specifically looks for `BOOT.md`, `AXIOMS.md`, etc., and avoids reading arbitrary files.
- **Fail-Safe:** If any file read fails (e.g., EACCES, ENOENT), it logs a warning via `debugLogger` and skips that file without crashing the application.

## 6. Test Strategy
We will add `athanorWeaver.test.ts` (or add to `promptProvider.test.ts`):
1. **Mocking `fs`:** Use `vi.mock('node:fs')` to simulate the presence/absence of Athanor directories and files.
2. **Mocking `process.env`:** Test `VESTA_ATHANOR_DIR` override.
3. **Caching Validation:** Verify that `fs.readFileSync` is only called once across multiple calls to `getAthanorContext()`.
4. **Integration Test:** Ensure `getCoreSystemPrompt` correctly appends the `<athanor_core>` tags when the weaver returns content.
