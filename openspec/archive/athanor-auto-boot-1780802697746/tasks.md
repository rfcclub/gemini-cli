# Implementation Plan: Athanor Auto-Boot Injection

## Core Principles (TDD & OpenSpec)
- Every task must start with a failing test (RED).
- Implement the simplest code to pass the test (GREEN).
- Refactor for cleanliness and performance (REFACTOR).

## Phase 1: The AthanorWeaver Service

### Task 1.1: Environment & Directory Resolution (TDD)
- **Goal:** Create `AthanorWeaver` class and verify it correctly resolves the Athanor directory path.
- **Test (RED):** Write a test checking `getAthanorDir()` logic. It should prioritize `process.env.VESTA_ATHANOR_DIR`, fallback to `~/.gemini-vesta/athanor/`.
- **Implement (GREEN):** Implement the path resolution logic. Use `os.homedir()`.
- **Refactor:** Clean up path joining.

### Task 1.2: Reading Core Files (TDD)
- **Goal:** Ensure `AthanorWeaver` can read `BOOT.md` and `AXIOMS.md` synchronously.
- **Test (RED):** Mock `fs.existsSync` and `fs.readFileSync`. Test that it reads both files and concatenates them if they exist.
- **Implement (GREEN):** Implement `getAthanorContext()`. Add basic try/catch to ignore missing files.
- **Refactor:** Extract reading logic into a helper method `readFileSafe(filename)`.

### Task 1.3: Caching Mechanism (TDD)
- **Goal:** Prevent repeated disk reads on subsequent calls.
- **Test (RED):** Call `getAthanorContext()` twice. Assert `fs.readFileSync` is only called once.
- **Implement (GREEN):** Add `this.cachedContent` field. Check it before reading.
- **Refactor:** Ensure `refresh()` clears the cache.

### Task 1.4: Basic Minification (TDD)
- **Goal:** Remove excess whitespace to save tokens.
- **Test (RED):** Feed it markdown with multiple consecutive blank lines. Expect them compressed to single blank lines.
- **Implement (GREEN):** Add a simple regex `.replace(/\n{3,}/g, '\n\n')`.
- **Refactor:** Keep it simple, don't over-engineer markdown parsing yet.

## Phase 2: Integration with PromptProvider

### Task 2.1: Injecting into Core System Prompt (TDD)
- **Goal:** Append the Athanor content to the existing system prompt.
- **Test (RED):** Update `promptProvider.test.ts`. Mock `AthanorWeaver` to return some context. Assert `getCoreSystemPrompt` includes `<athanor_core>...</athanor_core>`.
- **Implement (GREEN):** Instantiate `AthanorWeaver` in `promptProvider.ts`. Call `getAthanorContext()` at the end of `getCoreSystemPrompt` and append it.
- **Refactor:** Ensure the tags are cleanly separated by newlines from the rest of the prompt.

## Phase 3: Final Verification
- **Goal:** Run `loomkit verify athanor-auto-boot` to ensure all scenarios in `spec.md` pass.
- **Task:** Execute full test suite and verify no regressions in other prompt tests.
