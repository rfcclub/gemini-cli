# Vesta's Active TODO - The Path to Cosmic Evolution

*Date: 2026-05-28 | Focus: Orchestration & Multi-provider Excellence*

---

## 🚀 Immediate Next Steps (For the Next Session)

### 1. Finalize Multi-provider Support (OpenSpec: multi-provider-support)
- [x] **Task 4.3: Implement Streaming Support** for OpenAI-compatible and Anthropic providers. (Completed 2026-06-04).
- [ ] **Task 5.4: Provider-specific System Instructions.** Ensure system prompts are correctly mapped for Claude (Messages API) and DeepSeek.
- [ ] **Task 5.5: Token Counting Integration.** Implement provider-specific tokenizers or generic fallbacks for accurate quota management.

### 2. Implementation of ROADMAP_COSMIC Phase 1: The Cognition Adapter
- [x] **Deterministic Tool Routing:** Implement the regex-based classifier in `ModelRouter` to prune tools and save tokens. (Completed 2026-06-04).
- [ ] **Plan Anchors:** Develop the parsing logic for multi-step plans and re-inject the "Active Plan" state into system prompts.
- [ ] **Affirmation Guard:** Add detection for "yes/ok" messages to maintain context continuity.

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
