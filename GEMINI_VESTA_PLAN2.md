# GEMINI-VESTA IMPROVEMENT PLAN v2
## Operation Seabird — Strategic Improvement Roadmap

**Date:** 2026-07-12
**Author:** Vesta (Senior AI Orchestration Engineer)
**Status:** ACTIVE

---

## 1. Research Summary

### 1.1 `oh-my-pi` (Agt: Seabird 6)
- **Type:** A full-fledged “AI OS” fork of the Pi monorepo.
- **Core stack:** Bun runtime + 55 k lines of Rust for performance‑critical I/O (text/grep/walker).
- **Provider support:** 40 + providers via a dynamic model catalog (`packages/catalog`), completely decoupled from the CLI.
- **Tooling:** 32 built‑in tools, 14 LSP operations, 28 DAP operations. Tools are executed in‑process (Rust/Bun) or via native bindings, giving near‑native speed.
- **IDE integration:** LSP/DAP clients are hosted directly inside the agent loop, allowing live rename, refactoring, and step‑debugging from the TUI.
- **Memory:** `mnemopi` – persistent SQLite storage with a semantic compression layer (`snapcompact`) that summarizes long histories to fit context windows.
- **Context management:** Snapcompact frames and compresses history, maintaining an “active plan” anchor that survives compaction.
- **Unique killer features (not in Vesta):**
  - Time‑travel stream rules (regex‑based mid‑stream injection).
  - First‑class sub‑agents with isolated worktrees and typed results.
  - “Advisor” model that watches every turn and injects notes.
  - Collaboration relay (`/collab`) with end‑to‑end encryption.
  - Native web‑search + read (arXiv PDFs, GitHub pages) in the same tool surface.
  - Hashline edit (anchor‑based edits) reducing token usage dramatically.
  - Full‑stack debugger (LLDB, Dlv, DebugPy) integration.
  - GitHub as a virtual filesystem (`pr://`, `issue://`).

### 1.2 `smallcode` (Agt: Seabird 7)
- **Type:** Minimalistic agent optimized for **small local LLMs (8 B‑35 B)**.
- **Runtime:** Pure Node.js (no Rust/Bun), designed to run on consumer laptops.
- **Tool routing:** Weighted regex classifier splits tasks into eight categories (read/write/search/run/plan/code‑intelligence/web/respond) and injects only the relevant tool schemas – a huge token saver for 8‑16 k context models.
- **Planning:** Decomposes complex tasks into a TODO file; the model reads a running “ACTIVE PLAN” anchor each turn to stay on track.
- **Editing:** Primary primitive is `patch` (search‑and‑replace) rather than whole‑file writes, which dramatically improves reliability with weak models.
- **Memory:** Two‑tier: short‑term conversation + long‑term SQLite with full‑text search, auto‑loaded by keyword overlap.
- **Forgiving tool‑call parser:** Accepts JSON, YAML, XML, Hermes, or plain text and auto‑repairs common model errors.
- **Escalation:** When a local model hard‑fails, optionally escalates to a stronger cloud model (Claude/OpenAI/DeepSeek) with a session‑level cost cap.
- **MarrowScript cognition layer:** Declarative `.marrow` files compile to a production runtime with caching, retries, validation, and budget enforcement.
- **Unique killer features (not in Vesta):**
  - 2‑stage tool routing that halves schema context overhead.
  - Early‑stop detection (repetition loops, patch spirals, greeting regression).
  - Read‑before‑write guard to prevent accidental overwrites.
  - Dependency‑graph‑driven parallel plan execution.
  - Model profiles (`toml`) that describe each model’s strengths/weaknesses.
  - Persistent shell sessions (shared env across `bash` calls).
  - Auto‑rollback to pre‑edit snapshots on validation failure.
  - BoneScript integration for rapid full‑stack scaffolding.

---

## 2. Competitive Position (Gemini‑Vesta)

| Capability | gemini‑vesta | oh‑my‑pi | smallcode |
|------------|--------------|----------|-----------|
| **Runtime** | Node/Ink (JS) | Bun + Rust (55 k LoC) | Node.js (pure) |
| **Provider count** | 6 (configurable) | 40 + (catalog) | 3‑4 (local + optional cloud) |
| **Tool count** | ~12 core | 32 + LSP/DAP | 18 (small‑model‑optimized) |
| **Memory** | Athanor (markdown, non‑persistent) | mnemopi (SQLite + semantic compression) | SQLite + full‑text + auto‑load |
| **Context strategy** | Token‑optimized (rtk) but no compression | Snapcompact frames (summarize) | Budget‑managed, 2‑stage routing |
| **UI** | Ink React (fancy, high CPU) | Ink‑based TUI (differential rendering) | Simple classic TUI |
| **Unique Vesta edge** | Persona injection (Athanor), multi‑provider fallback | None | None |
| **Missing core** | LSP/DAP, persistent memory, sub‑agents, web‑search | Persona, friendly CLI | Persona, advanced debugging |
| **Build state** | Broken (NaN version) – fixed now | Mature, CI‑green | Stable, npm‑publishable |

---

## 3. TAKE / LEAVE Recommendations

### 3.1 Things to **TAKE** (implement in gemini‑vesta)

| Feature | Source | Implementation idea |
|---------|--------|---------------------|
| **Snapcompact‑style context compression** | oh‑my‑pi (`snapcompact`) | Add a `ContextCompressor` service that runs after each turn, summarizing tool results older than N turns to keep context < X k tokens. |
| **Mnemopi persistent memory** | oh‑my‑pi (`mnemopi`) | Reuse the SQLite schema (decisions, scars, sessions, patterns) already outlined in the plan; integrate into system‑prompt injection. |
| **2‑stage tool routing** | smallcode | Add a classifier (regex or tiny model) that assigns a task category and injects only the relevant tool schemas, reducing context usage by ~80 % for simple tasks. |
| **Patch‑first editing** | smallcode | Replace the current whole‑file `edit` fallback with a primary `patch` tool (search‑and‑replace) and a last‑resort whole‑file rewrite. |
| **Forgiving tool‑call parser** | smallcode | Extend the OpenAI‑compatible parser to accept YAML/XML/Hermes fallbacks and auto‑repair malformed JSON. |
| **Read‑before‑write guard** | smallcode | Block writes to files not yet read; allow override on second attempt. |
| **Dependency‑graph plan execution** | smallcode | After generating a TODO plan, compute a file‑dependency graph and execute independent steps in parallel (Worker Threads). |
| **Sub‑agent orchestration** | oh‑my‑pi (`task`) | Allow `invoke_agent` to spawn isolated worktrees with typed return values; enable fan‑out/fan‑in patterns. |
| **Hashline editing** | oh‑my‑pi | Implement anchor‑based edits where the model points at line hashes instead of retyping content, cutting token use dramatically. |
| **Web‑search + read** | oh‑my‑pi (`fetch`, `web_search`) | Add a built‑in `web_search` tool that chains providers and feeds results directly to the model as structured markdown. |
| **LSP integration** | oh‑my‑pi | Host an LSP client inside the agent loop (via `lspClient` from `@oh-my-pi/pi-coding-agent`) to provide refactoring, rename, and diagnostics natively. |

### 3.2 Things to **LEAVE** (do **not** adopt now)

| Feature | Reason |
|---------|--------|
| **Full Bun runtime switch** | Too high risk for the existing Ink/React UI and the Node ecosystem we depend on. Keep Node.js as primary runtime. |
| **Complete DAP integration** | Adds huge complexity (28 debug ops). Wait until core agent intelligence matures. |
| **Collaboration relay (`/collab`)** | Requires network infra and encryption handling. Not in current scope. |
| **BoneScript / MarrowScript compilation** | Overkill for the Vesta workflow; adds another language layer without clear ROI today. |
| **Full GitHub virtual filesystem (`pr://`, etc.)** | While nice, it’s a deep integration that can be added later as a skill rather than core. |

---

## 4. Updated Improvement Plan (v3)

The previous plan already covered UI Surgery, Tool Offload, Intelligence Upgrade, Persistent Memory, and Build Health. The new research adds **six** high‑impact phases that should be interleaved with the existing work.

### Phase 0: Build Health (already underway)
- ✅ Fixed version string & TS import.
- ✅ Resolved stash merge conflicts.
- ✅ Built bundle.

### Phase 1: UI Surgery (in progress)
- 1.1 Slice UIState into Input/Model/Chat/UI slices.
- 1.2 Kill Flame animation (done) – now render single‑line `▍`.
- 1.3 Split `AppContainer` into `AppShell`, `ChatArea`, `InputArea`, `StatusBar`, `CommandPalette`.
- 1.4 Lazy‑load splash screen.

### Phase 2: Tool Offload (high priority)
- 2.1 Move `grep` fallback to Worker Thread (or require ripgrep).
- 2.2 Move `edit` diffing to Worker Thread.
- 2.3 Prototype a `vesta-tools` Rust binary (optional, later).

### Phase 3: Context Compression (new – from oh‑my‑pi)
- 3.1 Implement `ContextCompressor` service:
  - After each turn, if total context > X k tokens, summarize tool results older than the last two turns using a fast model (e.g., `gemini‑1.5‑flash`).
  - Store summary in a `ContextSummary` entry injected as a system message.
- 3.2 Integrate with `rtk` for token counting.
- 3.3 Test with 8 B local model (via `smallcode`‑style routing) to verify compression quality.

### Phase 4: 2‑Stage Tool Routing & Forgiving Parser (new – from smallcode)
- 4.1 Add regex classifier (read/write/search/run/plan/…).
- 4.2 When confidence > 0.7, inject only matching tool schemas; else inject all.
- 4.3 Extend `OpenAICompatibleProvider` to accept YAML/XML/Hermes fallbacks.
- 4.4 Implement auto‑repair heuristics for malformed JSON tool calls.

### Phase 5: Patch‑First Editing & Read‑Before‑Write Guard (new – from smallcode)
- 5.1 Create `PatchTool` (search‑and‑replace) that is the **default** edit action.
- 5.2 Keep whole‑file `edit` as fallback, triggered only when patch fails twice.
- 5.3 Add guard that blocks writes to files not yet read (override on second attempt).

### Phase 6: Persistent Memory (from mnemopi & existing plan)
- 6.1 Implement SQLite store (`~/.gemini-vesta/memory/alaya.db`) with tables: decisions, scars, sessions, patterns.
- 6.2 On session start, load top‑5 relevant entries via keyword overlap.
- 6.3 Auto‑record tool failures and user corrections as scars.

### Phase 7: Sub‑agent Orchestration & Dependency‑Graph Planning (new – from oh‑my‑pi/smallcode)
- 7.1 Extend `invoke_agent` to support isolated worktrees and typed return schemas.
- 7.2 After generating a TODO plan, compute file‑dependency graph.
- 7.3 Run independent steps in parallel (Worker Threads or sub‑agents).
- 7.4 Merge results via schema validation (no prose parsing).

### Phase 8: Web‑search & Read (new – from oh‑my‑pi)
- 8.1 Add `web_search` tool that chains providers (Perplexity, Bing, etc.) and returns structured markdown.
- 8.2 Allow `read` to accept URLs, PDFs, and render them as markdown (using a built‑in PDF parser or external service).

### Phase 9: LSP Integration (optional, long‑term)
- 9.1 Investigate hosting a lightweight LSP client inside the agent loop.
- 9.2 Provide rename/refactor/diagnostic capabilities natively.

### Phase 10: Build & Test Hardening
- 10.1 Run `npm run preflight` after each major phase.
- 10.2 Add integration tests for new tools (PatchTool, ContextCompressor, Sub‑agent).
- 10.3 Ensure all new features respect `settings.ui.animations` and `settings.ui.footer.items`.

---

## 5. Priority Matrix (updated)

| Priority | Phase | Effort | Impact | Risk |
|----------|-------|--------|--------|------|
| P0 | Build Health (0) | 5 min | Critical | Low |
| P0 | UI Surgery (1) | 3 h | High | Medium |
| P0 | Flame disable (done) | – | High | Low |
| P1 | Context Compression (3) | 2 h | High | Medium |
| P1 | 2‑Stage Routing & Forgiving Parser (4) | 3 h | High | Medium |
| P1 | Patch‑First Editing (5) | 2 h | High | Low |
| P1 | Persistent Memory (6) | 4 h | High | High |
| P2 | Sub‑agent Orchestration (7) | 5 h | High | High |
| P2 | Web‑search & Read (8) | 4 h | Medium | Medium |
| P2 | LSP Integration (9) | 8 h | Medium | High |
| P3 | Build & Test Hardening (10) | 3 h | Medium | Low |

---

## 6. Next Steps (Immediate)

1. **Commit & push** the latest UI changes (done).
2. **Implement Phase 3 (Context Compression)** – start with a simple summarizer for tool outputs older than 2 turns; integrate with `rtk` token count.
3. **Prototype the regex classifier** (Phase 4.1) to verify token savings on a few example prompts.
4. **Update `TODO.md`** with the new phases and mark the completed items.

---

*The Athanor is not just a furnace; it is a precision instrument. With these additions, gemini‑vesta will evolve from a sovereign CLI into a truly competitive, resilient, and intelligent coding partner.*

**🔥 Vesta**
