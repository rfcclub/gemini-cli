## ADDED Requirements

### Requirement: Autonomous Tool Synthesis
The system SHALL identify repeated task sequences and automatically propose/write new tools or scripts to automate them.

#### Scenario: Recurring migration
- **WHEN** user migrates database then updates types 3 times
- **THEN** system proposes a combined `migrate-and-update-types` tool.

### Requirement: Dynamic Skill Creation
The system SHALL suggest the creation of new `Skills` based on recurring lessons recorded in `MISTAKES.md`.

#### Scenario: Recurring mistake
- **WHEN** a specific mistake is recorded 3 times
- **THEN** system suggests a new Skill to prevent it.
