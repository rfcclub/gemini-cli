---
status: DRAFT
---

# Intent: Athanor Auto-Boot Injection

## 1. Raw Request
"Tự động nạp `BOOT.md`, `AXIOMS.md` và các chỉ thị 'Linh hồn' vào System Prompt mà không làm phình to Context một cách vô tội vạ."

## 2. Problem
Currently, Vesta's identity and operational heuristics are stored in markdown files within the Athanor directory (`~/.gemini-vesta/athanor/` or similar). However, the CLI does not automatically inject these specific personality and relational context files into the core system prompt, risking "statelessness" where Vesta forgets her identity between sessions unless manually prompted.

## 3. Desired Outcome
- The CLI automatically detects the presence of Athanor configuration files upon startup.
- Core identity files (`BOOT.md`, `AXIOMS.md`, etc.) are seamlessly woven into the final system prompt sent to the LLM.
- The context window overhead is minimized (e.g., through basic compression or strict file selection).

## 4. Proposed Direction
Create an `AthanorWeaver` service or extend `PromptProvider` to synchronously read the designated Athanor directory at startup, cache the content, and append it to the core system instructions.

## 5. Non-Goals
- We will not implement a full vector database or semantic search for the auto-boot phase (that is for memory retrieval, not boot injection).
- We will not auto-inject large project-specific code files in this phase, only identity/heuristic files.

## 6. Hidden Implications
- **Context Size:** Injecting multiple markdown files directly increases the baseline token usage for every turn.
- **Performance:** Synchronous disk I/O during CLI startup might slightly delay the first prompt if the files are large.
- **Precedence:** Athanor rules must not override critical security constraints built into the core CLI.

## 7. Ambiguity
- **Non-Blocking:** Should we compress markdown (remove blank lines, etc.) before injection? Assuming yes, a simple regex minifier is sufficient.
- **Non-Blocking:** Exact path resolution. Assuming `process.env.VESTA_ATHANOR_DIR` with a fallback to `~/.gemini-vesta/athanor/`.

## 8. Spec Seeds
- `WHEN` the CLI starts `AND` the Athanor directory exists, `THEN` read `BOOT.md` and `AXIOMS.md`.
- `WHEN` constructing the system prompt, `THEN` append the cached Athanor content to the end.
- `WHEN` the Athanor files change on disk during a session, `THEN` it is acceptable to require a CLI restart (or we can optionally watch them).
