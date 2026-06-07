## ADDED Requirements

### Requirement: Agent-Graph Integration
The `AgentSession` SHALL be modified to support coordination between multi-role subagents (build, plan, generalist).

#### Scenario: Switching roles
- **WHEN** task classification changes from "Search" to "Write"
- **THEN** `AgentSession` transitions from `plan` agent context to `build` agent context.

### Requirement: Escalation Logic Integration
The `AgentSession` SHALL integrate with the escalation service to trigger model switches on persistent failures.

#### Scenario: Escalating a session
- **WHEN** failure threshold is reached
- **THEN** `AgentSession` restarts the loop with the "Pro" model.
