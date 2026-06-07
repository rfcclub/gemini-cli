## ADDED Requirements

### Requirement: SOUL-Driven Biasing
The system SHALL read the `SOUL.md` document at session start and utilize its content to dynamically bias the model's system prompt (tone, constraints, and priorities).

#### Scenario: Vesta awakens
- **WHEN** session starts
- **THEN** system reads `SOUL.md` and injects its core values into the initial system prompt.

### Requirement: Automated Mistake Recording
The system SHALL automatically record tool failures or user-corrected edits into `athanor/MISTAKES.md`.

#### Scenario: Tool call fails
- **WHEN** a tool call returns an error
- **THEN** system logs the failure and the context into `athanor/MISTAKES.md` for future avoidance.
