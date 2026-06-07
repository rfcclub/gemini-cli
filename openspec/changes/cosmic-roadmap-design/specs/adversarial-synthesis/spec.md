## ADDED Requirements

### Requirement: Internal Self-Review Loop
The system SHALL execute an internal "critique" turn for tasks with high complexity scores (> 50) before presenting the result to the user.

#### Scenario: High complexity edit
- **WHEN** complexity score is 75
- **THEN** system runs an internal review pass to identify potential logic errors or missing imports.

### Requirement: Virtual Execution Simulation
The system SHALL simulate the execution of destructive commands (e.g., `rm`, `git reset`) in its "mind" and warn the user of potential risks.

#### Scenario: Risky command
- **WHEN** model plans to run `rm -rf *`
- **THEN** system warns the user about the destructive nature of the command before asking for confirmation.
