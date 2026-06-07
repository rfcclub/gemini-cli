## ADDED Requirements

### Requirement: Density-Optimized TUI
The system SHALL refine Ink components to maximize information density while maintaining readability, inspired by the "ratatui" aesthetic.

#### Scenario: Displaying logs
- **WHEN** displaying multiple log streams
- **THEN** system uses a compact grid layout with color-coded severity.

### Requirement: Plan Gall Display
The system SHALL display the current plan status (✓ done, → current, ⋯ next) in a persistent UI element during multi-step tasks.

#### Scenario: Running a plan
- **WHEN** a plan is active
- **THEN** system shows a progress indicator in the TUI footer.
