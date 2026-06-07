## ADDED Requirements

### Requirement: Anticipatory Retrieval
The system SHALL predict and pre-read dependency files in the background while the user is typing or while the model is processing a related task.

#### Scenario: User types about a module
- **WHEN** user types "edit the auth module"
- **THEN** system pre-reads `auth.ts` and its direct imports into the cache.

### Requirement: Context Pre-fetching
The system SHALL automatically fetch relevant logs or recent git diffs if the user's message implies a debugging or synchronization task.

#### Scenario: User mentions a crash
- **WHEN** user sends "why did it crash?"
- **THEN** system automatically fetches the last 50 lines of logs and the most recent git commit.
