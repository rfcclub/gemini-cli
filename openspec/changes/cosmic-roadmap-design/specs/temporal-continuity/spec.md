## ADDED Requirements

### Requirement: Architectural Memory
The system SHALL store and retrieve high-level architectural decisions and patterns in a persistent SQLite database.

#### Scenario: Pattern recognition
- **WHEN** user asks for a new module
- **THEN** system retrieves past module patterns from SQLite and suggests a consistent structure.

### Requirement: Evolutionary Repo Context
The system SHALL maintain a "Repo Evolution Log" that summarizes major changes and the rationale behind them.

#### Scenario: Why was this changed?
- **WHEN** user asks about a specific design choice
- **THEN** system retrieves the rationale from the Repo Evolution Log.
