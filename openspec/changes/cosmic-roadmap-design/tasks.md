## 1. Phase 1: Cognition Adapter

- [ ] 1.1 Implement Regex-based task classification in `ModelRouter`.
- [ ] 1.2 Modify `AgentSession` to prune tool schemas based on classification.
- [ ] 1.3 Implement plan parsing from model responses.
- [ ] 1.4 Add plan anchor injection to system prompt.
- [ ] 1.5 Implement affirmation guard to preserve task context.

## 2. Phase 2: Deep Identity

- [ ] 2.1 Implement `SOUL.md` reader and prompt biasing logic.
- [ ] 2.2 Create `athanor/MISTAKES.md` and automated logging system.
- [ ] 2.3 Integrate mistake context into relevant prompts.

## 3. Phase 3: Agent Graphs

- [ ] 3.1 Refactor `AgentSession` to support build/plan/generalist role separation.
- [ ] 3.2 Implement read-only mode for the `plan` agent.
- [ ] 3.3 Implement task failure monitoring and model escalation triggers.
- [ ] 3.4 Create "Recovery Protocol" prompt for escalated turns.

## 4. Phase 4: High-Signal UI

- [ ] 4.1 Refine Ink components for higher information density.
- [ ] 4.2 Implement persistent plan progress indicator in TUI footer.
- [ ] 4.3 Add color-coded log severity and compact layout options.

## 5. Phase 5: Speculative Intelligence

- [ ] 5.1 Implement anticipatory file retrieval based on user input intent.
- [ ] 5.2 Add context pre-fetching for debugging and sync tasks.
- [ ] 5.3 Implement background async reading and caching.

## 6. Phase 6: Adversarial Synthesis

- [ ] 6.1 Implement internal self-review loop for high-complexity tasks.
- [ ] 6.2 Add virtual execution simulation and risk warning system.
- [ ] 6.3 Implement self-correction turn before user delivery.

## 7. Phase 7: Temporal Continuity

- [ ] 7.1 Setup persistent SQLite database for technical decisions and patterns.
- [ ] 7.2 Implement architectural memory retrieval based on task context.
- [ ] 7.3 Create and maintain the Repo Evolution Log.

## 8. Phase 8: Evolutionary Tooling

- [ ] 8.1 Implement pattern recognition for repeated task sequences.
- [ ] 8.2 Add autonomous synthesis of new tools and scripts.
- [ ] 8.3 Implement dynamic Skill suggestion system based on `MISTAKES.md`.
