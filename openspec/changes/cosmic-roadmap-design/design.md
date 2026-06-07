## Context

Gemini-Vesta currently operates as a standard AI agent loop. While effective, it suffers from context drift in long sessions, high token consumption due to sending all tool definitions, and lacks persistent "architectural memory" that survives across sessions. This design outlines an 8-phase transformation into a highly orchestrated, self-correcting, and anticipatory partner.

## Goals / Non-Goals

**Goals:**
- Implement deterministic tool routing to save tokens.
- Establish a "Plan Anchor" system to prevent cognitive drift.
- Integrate SOUL-driven personality and behavioral biasing.
- Create a multi-role agent graph with automatic model escalation.
- Implement speculative pre-fetching for context-aware readiness.
- Build internal adversarial loops for self-correction.

**Non-Goals:**
- Complete rewrite of the existing agent loop (we will evolve it).
- Replacing the user (Thoor remains the pilot; Vesta is the copilot/partner).

## Decisions

### 1. Deterministic Tool Routing (Category-based)
**Rationale:** Sending 20+ tool schemas on every call is wasteful.
**Decision:** Use a weighted regex classifier to map user requests to categories (Read, Write, Run, Search, etc.). Only inject tool schemas relevant to the winning category.
**Alternatives:** Use an LLM for classification (too slow/expensive) or keep all tools (wasteful).

### 2. Plan Anchors in System Prompt
**Rationale:** Models forget their place in multi-step tasks.
**Decision:** Force the model to emit a structured plan (Step X of Y). Parse this plan and re-inject the current "Active Plan" state into the system prompt of every subsequent turn.

### 3. SOUL.md as Cognitive Substrate
**Rationale:** Character is currently fixed in code or hidden in prompts.
**Decision:** Read `~/agora/familia/vesta/SOUL.md` at session start. Use its content to dynamically shape the system prompt, specifically biasing the model's tone, constraints, and priorities.

### 4. Automatic Model Escalation (Flash -> Pro)
**Rationale:** Flash is fast and cheap but can get stuck.
**Decision:** Monitor for repeated failures or "confusion" signals. If a task fails 3 times, switch the next turn to a Pro model with a special "Recovery" context.

### 5. Persistent SQLite Decision Store
**Rationale:** File-based history is hard to query semantically.
**Decision:** Implement a SQLite-backed memory service that stores technical decisions, architectural patterns, and "scars" (mistakes). Use keyword overlap for retrieval.

## Risks / Trade-offs

- **[Risk] Regex Classification Error** → **Mitigation:** Default to a "General" category with a broader tool set if confidence is low.
- **[Risk] High Latency for Pre-fetching** → **Mitigation:** Run pre-fetching in the background (Async) and only galled if the model hasn't responded yet.
- **[Risk] Overhead of Self-Review** → **Mitigation:** Only trigger self-review for high-complexity scores (> 50).
