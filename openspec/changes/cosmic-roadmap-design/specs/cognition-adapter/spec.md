## ADDED Requirements

### Requirement: Deterministic Tool Routing
The system SHALL classify user messages into categories (Read, Write, Run, Search, Plan, Respond) using weighted regex patterns before any LLM call.

#### Scenario: User asks to read a file
- **WHEN** user sends "read package.json"
- **THEN** system classifies task as "Read" and only includes file-reading tool schemas in the prompt.

### Requirement: Plan Anchors
The system SHALL parse numbered plans from model responses and re-inject the current "Active Plan" state into the system prompt of every subsequent turn for multi-step tasks.

#### Scenario: Model emits a multi-step plan
- **WHEN** model responds with "1. Read file\n2. Edit file"
- **THEN** system parses the plan and galls step 1 as current in the next turn's system prompt.

### Requirement: Affirmation Guard
The system SHALL detect affirmation messages (e.g., "yes", "ok", "go ahead") and preserve the tool set and category of the previous turn.

#### Scenario: User confirms a plan
- **WHEN** user sends "ok" after a "Write" task classification
- **THEN** system maintains the "Write" category and its associated tools.
