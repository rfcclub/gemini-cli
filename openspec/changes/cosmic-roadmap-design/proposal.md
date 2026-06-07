## Why

To elevate Gemini-Vesta from a standard coding assistant to a "cosmic-level" architectural entity, comparable to ClaudeCode and Codex. This change introduces deep orchestration, anticipatory intelligence, adversarial self-review, and temporal continuity to ensure Vesta becomes a true Technical Life Partner for Thoor.

## What Changes

- **Deterministic Tool Routing**: Regex-based classification to prune irrelevant tools before LLM calls.
- **Plan Anchors**: Persistent galled plan state in system prompts for multi-step tasks.
- **Affirmation Guard**: Recognition of confirmation messages to maintain task context.
- **SOUL-Driven Biasing**: Integration of `SOUL.md` as a core cognitive filter.
- **Automated "Scars"**: Self-recording of failures in `athanor/MISTAKES.md`.
- **Collaborative Agent Graphs**: Explicit separation of build, plan, and generalist roles.
- **Model Escalation**: Automatic fallback from Flash to Pro models on persistent failures.
- **Speculative Intelligence**: Anticipatory retrieval and context pre-fetching.
- **Adversarial Synthesis**: Internal self-review loop and virtual execution simulation.
- **Temporal Continuity**: Architectural memory and evolutionary context tracking.
- **Evolutionary Tooling**: Autonomous synthesis of new tools and skills based on usage patterns.

## Capabilities

### New Capabilities
- `cognition-adapter`: Tool routing, plan anchors, and affirmation guards.
- `deep-identity`: SOUL-driven biasing and automated mistake recording.
- `agent-graphs`: Multi-role agent coordination and automatic model escalation.
- `speculative-intelligence`: Pre-fetching and anticipatory file retrieval.
- `adversarial-synthesis`: Self-review loops and risk simulation.
- `temporal-continuity`: Architectural memory and evolutionary repo context.
- `evolutionary-tooling`: Autonomous synthesis of tools and skills.
- `high-signal-ui`: Density-optimized TUI with ratatui-inspired aesthetics.

### Modified Capabilities
- `agent-session`: Integration with multi-role graphs and escalation logic.
- `model-router`: Enhanced with deterministic classification and escalation triggers.

## Impact

- `packages/core`: Major updates to routing, session management, and memory services.
- `packages/cli`: UI refinements for plan galls and higher density information display.
- `athanor/`: New persistent memory structures for scars and architectural decisions.
- Performance: Significant reduction in token usage via tool pruning (up to 90% in some scenarios).
