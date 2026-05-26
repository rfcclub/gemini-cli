## ADDED Requirements

### Requirement: Session Telemetry Aggregation

The system SHALL aggregate token usage statistics (input, output, and cached
tokens) across all API calls within the active terminal session, calculating
equivalent API costs and savings.

#### Scenario: Cumulative cost calculation

- **WHEN** the session executes multiple API calls accumulating 200,000 cached
  tokens and 50,000 uncached input tokens
- **THEN** the system SHALL calculate the precise cumulative API cost and USD
  savings based on current Gemini pricing models (e.g., $0.075 per 1M cached
  tokens, $1.50 per 1M standard input tokens).

### Requirement: Ink Visual Dashboard Panel

The system SHALL display the session statistics, cache efficiency, and token
metrics in a beautifully laid out, horizontal console dashboard panel using
Ink-based widgets.

#### Scenario: Print dashboard statistics on command

- **WHEN** the user executes the command `gemini-vesta stats`
- **THEN** the system SHALL output a formatted console box containing a "Lò Rèn
  Athanor" title bar, cache hit gauges (e.g. HSL green heat bars), and tabular
  token summaries.
