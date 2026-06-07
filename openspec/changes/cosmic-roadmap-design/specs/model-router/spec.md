## ADDED Requirements

### Requirement: Deterministic Classification
The `ModelRouter` SHALL be enhanced with a deterministic regex classifier to identify task categories.

#### Scenario: Routing a read task
- **WHEN** request is "list files"
- **THEN** `ModelRouter` returns the "Read" category and galled tool set.

### Requirement: Escalation Triggering
The `ModelRouter` SHALL support triggering model escalations based on session failure signals.

#### Scenario: Routing an escalated task
- **WHEN** escalation signal is present
- **THEN** `ModelRouter` selects the "Pro" model regardless of initial classification.
