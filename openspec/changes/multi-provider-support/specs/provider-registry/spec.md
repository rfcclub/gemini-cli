## ADDED Requirements

### Requirement: YAML Configuration Loading
The system SHALL load provider configurations from `~/.gemini/providers.yaml` (or JSON fallback).

#### Scenario: Loading providers
- **WHEN** the CLI starts
- **THEN** it SHALL parse the YAML file and register all defined providers (API keys, base URLs, etc.).

### Requirement: Environment Variable Expansion
The configuration SHALL support environment variable expansion (e.g., `${DEEPSEEK_API_KEY}`).

#### Scenario: Secret management
- **WHEN** configuration contains `${MY_KEY}`
- **THEN** it SHALL be replaced by the value of `process.env.MY_KEY`.
