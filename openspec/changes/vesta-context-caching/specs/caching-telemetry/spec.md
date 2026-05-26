## ADDED Requirements

### Requirement: Real-time Telemetry Tracking

The system SHALL extract token usage metadata (specifically cached token counts)
from each Gemini API response and record it in the session telemetry store.

#### Scenario: Turn response returns cached tokens

- **WHEN** an API response is received and contains `cachedContentTokenCount`
  greater than 0
- **THEN** the system SHALL calculate the exact token savings and record it in
  the active session's telemetry store as a Cache Hit.

### Requirement: TUI Telemetry Rendering

The system SHALL display the caching status and token savings in the React Ink
terminal interface using premium, visual components and colors.

#### Scenario: Render cache savings in status bar

- **WHEN** the CLI interface updates its view and the active session has saved
  tokens through caching
- **THEN** the TUI SHALL display a styled status block (e.g., "Athanor Caching:
  ACTIVE (saved X tokens)") using themed HSL colors.
