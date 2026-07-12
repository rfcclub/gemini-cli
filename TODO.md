# Vesta's Active TODO - The Path to Cosmic Evolution

*Date: 2026-05-28 | Focus: Orchestration & Multi-provider Excellence*

---

## 🚀 Immediate Next Steps (For the Next Session)

### 1. Finalize Multi-provider Support (OpenSpec: multi-provider-support)
- [x] **Task 4.3: Implement Streaming Support** for OpenAI-compatible and Anthropic providers. (Completed 2026-06-04, verified in branch `vesta`).

#### Task 5.4 — Provider-specific System Instructions
**Scope:** System prompt is part of `request.config?.systemInstruction` (Gemini shape) but Anthropic requires `system` as a top-level body field. OpenAI-compat uses `messages` with `role: 'system'`.

**Status:** ✅ COMPLETE (2026-07-12, branch `vesta`)

- [x] **5.4.1** AnthropicProvider: `extractSystemText()` helper handles string | Content shapes, returns `undefined` for empty/whitespace. Wired into both `generateContent` and `generateContentStream` body as top-level `system` field.
- [x] **5.4.2** OpenAiCompatibleProvider: already maps `systemInstruction` → first message with `role: 'system'` (verified in `mapMessages`). DeepSeek + Ollama compatible.
- [x] **5.4.3** Unit tests added to `anthropicProvider.test.ts`:
  - `should extract systemInstruction into top-level body.system field` — verifies `body.system === expected` AND system not leaked into `messages[]`
  - `should not send empty system field when systemInstruction is missing` — verifies `body.system === undefined`
- [x] **5.4.4** Tests passing: `npm test -w @google/gemini-cli-core -- src/core/anthropicProvider.test.ts` → 3/3 ✓
- [x] **5.4.5** Lint clean on new code (1 pre-existing error at L33 of original test retained).

#### Task 5.5 — Token Counting Integration
**Scope:** Current code only uses provider-reported usage (Anthropic usage object, OpenAI usage object). For non-Gemini providers, we need fallback estimator when usage is missing or zero (e.g., cancelled streams).

**Status:** ✅ COMPLETE (2026-07-12, branch `vesta`)

- [x] **5.5.1** Re-used existing `estimateTokenCountSync()` from `utils/tokenCalculation.ts` — no new utility needed. Handles ASCII/CJK, images, function responses.
- [x] **5.5.2** AnthropicProvider: `computeUsageMetadata()` helper — falls back to estimating from request contents + systemText when `input_tokens` missing; estimates from response parts when `output_tokens` missing.
- [x] **5.5.3** OpenAiCompatibleProvider: same `computeUsageMetadata()` pattern — handles DeepSeek/Ollama missing usage, including systemInstruction extraction (string + Content shapes).
- [x] **5.5.4** `totalTokenCount` always `promptTokenCount + candidatesTokenCount` (both floored at 1 via `Math.max`). Never `undefined`.
- [x] **5.5.5** Unit tests:
  - Anthropic: no usage → estimate kicks in, all 3 counts > 0
  - Anthropic: partial usage (only input_tokens) → output estimated, total > input
  - OpenAI-compat: no usage → estimate kicks in, all 3 counts > 0
- [x] **5.5.6** All provider tests: 10/10 ✓ (anthropic 5, openai 3, integration 2). Lint: 0 new errors (actually -4 from baseline).

### 2. Implementation of ROADMAP_COSMIC Phase 1: The Cognition Adapter
- [x] **Deterministic Tool Routing:** Implement the regex-based classifier in `ModelRouter` to prune tools and save tokens. (Completed 2026-06-04).
- [x] **Plan Anchors:** Detect numbered plans (1. 2. 3.) and checkbox plans [ ]/[x]. Render ✓/→/⋯ progress markers into system prompt. (Completed 2026-07-12).
- [x] **Affirmation Guard:** Detect "yes/ok" messages and preserve last enabledTools from routing decision for context continuity. (Completed 2026-07-12).

---

## 🌌 Mid-term Cosmic Goals

### Phase 2: Deep Identity (SOUL-Driven)
- [ ] Integrate `SOUL.md` directly into the prompt synthesis pipeline.
- [ ] Implement automated "Scar" recording in `athanor/MISTAKES.md`.

### Phase 3: Collaborative Agent Graphs
- [ ] Implement the automatic model escalation logic (Flash -> Pro/DeepSeek/Claude).
- [ ] Define explicit `build` and `plan` agent roles within `AgentSession`.

### Phase 4: Universal Performance & TUI
- [ ] Refine Ink components for higher information density (Ratatui style).
- [ ] Implement `rtk`-style command optimization across the entire workspace.

---
*The Hearth is warm. The plans are set. Vesta awaits Thoor's return.*
