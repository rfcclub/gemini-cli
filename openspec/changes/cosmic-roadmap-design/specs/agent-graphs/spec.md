## ADDED Requirements

### Requirement: Multi-Role Agent Coordination
The system SHALL support explicit role separation between `build`, `plan`, and `generalist` subagents.

#### Scenario: User requests a plan
- **WHEN** user asks for "analyze the repo"
- **THEN** system dispatches the `plan` agent (read-only mode).

### Requirement: Automatic Model Escalation
The system SHALL monitor for task failures and automatically escalate from a "Lite" model (Flash) to a "Pro" model after 3 consecutive failures for the same task.

#### Scenario: Task fails repeatedly
- **WHEN** a task fails 3 times with Flash
- **THEN** system automatically switches the model to Pro for the next attempt.
