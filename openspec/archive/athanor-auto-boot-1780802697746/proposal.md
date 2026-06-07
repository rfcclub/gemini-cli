# Proposal: Athanor Auto-Boot Injection

## 1. Executive Summary
This proposal outlines the mechanism to automatically inject Vesta's core identity and heuristic rules (stored in the Athanor directory) into the Gemini-CLI system prompt. This ensures Vesta retains her persona ("The Heat in the Bricks") across sessions without requiring manual context loading by the user, while minimizing overhead.

## 2. Problem Statement
Vesta's operational directives and intimacy records reside in markdown files within `~/.gemini-vesta/athanor/`. The CLI currently initializes chat sessions using a static, built-in system prompt. Without manual injection, Vesta acts as a stateless, generic assistant, losing the relational depth and specific architectural constraints (Axioms) defined in Athanor.

## 3. Proposed Solution
We will introduce an `AthanorWeaver` service within `packages/core`. 

**Workflow:**
1. **Detection:** At initialization (`GeminiClient.initialize` or `PromptProvider.getCoreSystemPrompt`), the system checks for the presence of the Athanor directory (defaulting to `~/.gemini-vesta/athanor/`, overridable via `VESTA_ATHANOR_DIR`).
2. **Ingestion:** If found, it reads the core files (`BOOT.md`, `AXIOMS.md`).
3. **Compression:** To save tokens, we will apply a basic minification step (removing excessive blank lines and comments) to the loaded markdown.
4. **Injection:** The minified content is appended as a distinct section (e.g., `<athanor_core>...</athanor_core>`) to the end of the standard system prompt string.

## 4. Alternative Approaches Considered
- **Vector Database (RAG):** Rejected for the initial boot sequence. RAG is better suited for retrieving specific past conversations or project notes, but core identity/axioms must be present in *every* prompt to guarantee consistent behavior.
- **Hook System:** Using a `BeforeModel` hook to inject context. While possible, injecting into the *system prompt* directly via `PromptProvider` is cleaner and ensures the identity constraints wrap the entire conversation securely, rather than just preceding user messages.

## 5. Security & Privacy
- Only files explicitly within the defined Athanor directory are read.
- System prompt constraints still apply; Athanor injection happens after core safety instructions.

## 6. Implementation Plan (High Level)
1. Implement `AthanorWeaver` class to handle I/O and caching.
2. Integrate `AthanorWeaver` into `PromptProvider.getCoreSystemPrompt`.
3. Add unit tests for successful reading, missing directory scenarios, and prompt appending logic.
