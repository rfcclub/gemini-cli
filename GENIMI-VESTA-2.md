# GEMINI-VESTA IMPROVEMENT PLAN v2
## Operation Seabird — Strategic Improvement Roadmap

**Date:** 2026-07-12
**Author:** Vesta (Senior AI Orchestration Engineer)
**Status:** ACTIVE

---

## Competitive Landscape

| **Tool** | **Core** | **Killer Feature** |
|----------|----------|-------------------|
| OpenCode | OpenSpec Engine | "Explore Mode" — think before write, Stance-driven workflow |
| Codex | TypeScript/React + SEA | SDK extensibility, runtime patches, single binary |
| Claw-Code | Bun + Rust (rtk) | Extreme performance, browser automation, token optimization |
| Oh-My-Pi | gemini-vesta itself | Athanor persona, multi-provider routing, sovereign boot |
| Gemini-Vesta | TypeScript/Node + Ink | Persona injection, multi-model routing, cost tracking |

### What Competitors Do Better

| Area | Leader | Gap for Vesta |
|------|--------|---------------|
| UI Performance | Claw-Code (Bun) | AppContainer.tsx monolith (2885 lines, 129 UIState props) |
| IO Performance | Codex (SEA/Rust) | Sync IO blocks main thread (GrepTool fallback, EditTool diffing) |
| CPU Usage | All | useFlameAnimation burns CPU via setInterval |
| Binary Distribution | Codex (SEA) | Vesta still relies on esbuild bundle |
| Memory/Context | OpenCode (Explore) | No persistent memory (Alaya/SQLite not implemented) |

### What Vesta Does Better

| Area | Vesta Advantage |
|------|-----------------|
| Persona | Athanor Boot Injection — no competitor has this |
| Multi-model | ProviderRegistry + ModelRouterService (fallback, prefix routing) |
| Security | PolicyEngine multi-tier (Admin > User > Workspace > Default) |
| Features | Paste Image, Cost Tracking, Browser Automation, Context Compression |
| Skills | Dynamic skill discovery + activation system |

---

## Phase 1: UI Surgery (Priority: CRITICAL)
**Goal:** Eliminate "UI Monolith", reduce 80% CPU waste, eliminate render storms.

### 1.1 Slice UIState (Remove Context Bloat)
- **Problem:** `UIStateContext.tsx` has 129 properties. Any small change triggers full re-render.
- **Action:** Split UIState into independent slices:
  - `InputSlice` — cursor position, composition state, buffer text
  - `ModelSlice` — current model, streaming status, token count
  - `ChatSlice` — messages, tool outputs, error state
  - `UISlice` — theme, animations, layout preferences
- **Pattern:** Use `useSyncExternalStore` or multiple small Contexts instead of one giant Context.
- **Expected:** 90% reduction in unnecessary re-renders.

### 1.2 Kill Flame Animation Waste
- **Problem:** `useFlameAnimation.ts` uses `setInterval` for continuous CPU burn.
- **Action:**
  - Replace `setInterval` with `requestAnimationFrame` (only when terminal is focused).
  - Add idle detection: if no user input for 5s, pause animation completely.
  - Make animation conditional on `settings.ui.animations` (default: false).
- **Expected:** 60-80% CPU reduction during idle.

### 1.3 Split AppContainer.tsx
- **Problem:** 2885-line monolith component.
- **Action:** Extract into smaller composable components:
  - `AppShell` — layout + theme
  - `ChatArea` — message list + streaming
  - `InputArea` — text input + paste handling
  - `StatusBar` — model info + cost
  - `CommandPalette` — `/model`, `/help`, etc.
- **Expected:** Better maintainability, targeted re-renders.

### 1.4 Lazy-load Splash Screen
- **Problem:** VestaSplash.tsx is dead code but its hook still loads.
- **Action:** Remove or lazy-load. Only show splash on first boot, not every session.

---

## Phase 2: Tool Offload (Priority: HIGH)
**Goal:** Eliminate blocking IO, move heavy tools to Worker Threads / Rust.

### 2.1 GrepTool Worker Offload
- **Problem:** Fallback reads entire file into RAM synchronously.
- **Action:**
  - Move `performGrepSearch` to a Worker Thread.
  - Eliminate naive JS fallback entirely — require `ripgrep` or fail gracefully.
- **Expected:** Zero UI freeze during grep.

### 2.2 EditTool Diffing Offload
- **Problem:** Complex diffing/patching runs on main thread.
- **Action:**
  - Move `applyReplacement` to a Worker Thread.
  - Use async diff computation with UI progress indicator.
- **Expected:** UI stays responsive during large file edits.

### 2.3 Rust Tool Harness (Medium-term)
- **Action:** Create a Rust binary (`vesta-tools`) that handles:
  - Grep (ripgrep wrapper)
  - Diff/patch computation
  - File hashing and comparison
  - Token counting (provider-agnostic)
- **Integration:** Spawn as child process, communicate via stdin/stdout JSON.
- **Expected:** 10x faster tool execution for CPU-bound operations.

---

## Phase 3: Intelligence Upgrade (Priority: MEDIUM)
**Goal:** Add "Explore Mode" and "Stance-driven" workflow from OpenCode.

### 3.1 Explore Mode (Read-only Think)
- **Concept:** When user asks a complex question, agent enters "Explore Mode":
  - Can READ files, search, and analyze.
  - CANNOT write/edit files.
  - Must produce a structured plan before any modification.
- **Implementation:** Add `mode: 'explore' | 'execute'` to AgentSession.
- **Benefit:** Prevents premature code changes, reduces wasted work.

### 3.2 Affirmation Guard (Active)
- **Concept:** Detect "yes", "ok", "go ahead" and preserve previous task context.
- **Implementation:** Already in ROADMAP_COSMIC. Wire into ModelRouterService.
- **Benefit:** Prevents context loss on short confirmations.

### 3.3 Plan Anchors
- **Concept:** For tasks > 3 steps, force model to emit a structured plan.
- **Re-inject** the active plan (✓ done, → current, ⋯ next) in every turn.
- **Benefit:** Prevents model drift on long tasks.

---

## Phase 4: Persistent Memory (Priority: MEDIUM)
**Goal:** Implement "Alaya Memory" — SQLite-based persistent context.

### 4.1 SQLite Store
- **Schema:**
  - `decisions` — architectural decisions with rationale
  - `scars` — mistakes and lessons (from MISTAKES.md)
  - `sessions` — session summaries with key findings
  - `patterns` — recurring code patterns and preferences
- **Location:** `~/.gemini-vesta/memory/alaya.db`

### 4.2 Keyword-overlap Retrieval
- On session start, extract keywords from current context.
- Query SQLite for relevant past decisions/scars.
- Inject top-5 relevant entries into system prompt.

### 4.3 Auto-scar Recording
- When tool fails or user corrects a change, automatically record to SQLite.
- Mark as "high priority" for future injection.

---

## Phase 5: Build Health (Priority: CRITICAL)
**Goal:** Fix broken build, clean technical debt.

### 5.1 Fix Version String
- **Current:** `"0.47.NaN.20260602.NaN"` in package.json.
- **Action:** Restore to `"0.47.0-nightly.20260602.gcfcecebe8"` or correct semver.
- **Verify:** `npm run build` succeeds.

### 5.2 Pop Stash
- `stash@{0}` contains AthanorWeaver feature (steeringModel, App.tsx memo, animations).
- Apply cleanly, resolve conflicts if any.

### 5.3 Push 13 Unpushed Commits
- Push all commits on `vesta` branch to `origin/vesta`.

### 5.4 Archive Stale LoomKit Changes
- Decide: archive or delete the 7 stale active changes.
- Archive completed ones (vesta-context-caching).
- Delete empty/aspirational ones (cosmic-roadmap-design — it's a wishlist, not a spec).

### 5.5 Configure Upstream Remote
- Add `upstream` remote pointing to `google-gemini/gemini-cli`.
- Enable periodic sync with upstream.

### 5.6 Fix Pre-existing Test Failures
- `fileWatcher.test.ts` timeout (flaky)
- Snapshot test in InputPrompt
- Double-click mouse test

---

## Execution Priority Matrix

| Priority | Phase | Effort | Impact | Risk |
|----------|-------|--------|--------|------|
| P0 | 5.1 Fix build | 5 min | Critical | Low |
| P0 | 5.2 Pop stash | 10 min | High | Medium |
| P0 | 5.3 Push commits | 2 min | High | Low |
| P1 | 1.1 Slice UIState | 2-3 hours | Critical | Medium |
| P1 | 1.2 Kill flame waste | 30 min | High | Low |
| P1 | 1.3 Split AppContainer | 3-4 hours | High | Medium |
| P2 | 2.1 GrepTool worker | 1 hour | High | Low |
| P2 | 2.2 EditTool worker | 1-2 hours | High | Medium |
| P3 | 3.1 Explore Mode | 2-3 hours | Medium | Low |
| P3 | 3.2 Affirmation Guard | 1 hour | Medium | Low |
| P3 | 3.3 Plan Anchors | 2 hours | Medium | Low |
| P4 | 4.1-4.3 SQLite Memory | 4-6 hours | High | High |
| P5 | 5.4-5.6 Cleanup | 1-2 hours | Low | Low |

---

## Competitive Positioning (After Execution)

| Area | Before | After |
|------|--------|-------|
| UI Performance | 🔴 Monolith (2885 lines) | 🟢 Sliced (50-100 lines each) |
| CPU Usage | 🔴 Flame burns CPU | 🟢 Idle-aware, rAF-based |
| IO Blocking | 🔴 Sync on main thread | 🟢 Worker Threads |
| Tool Speed | 🟡 JS fallback | 🟢 Rust harness |
| Memory | 🔴 Stateless sessions | 🟢 SQLite persistent |
| Workflow | 🟡 Hardcoded steps | 🟢 Explore Mode + Stance |
| Build | 🔴 Broken (NaN version) | 🟢 Clean + upstream sync |

---

*The Athanor is not just a furnace — it is a weapon of precision. Now we sharpen it.*

**🔥 Vesta**
