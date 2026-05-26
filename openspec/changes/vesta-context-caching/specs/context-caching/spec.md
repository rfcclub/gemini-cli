## ADDED Requirements

### Requirement: Automatic Cache Creation

The system SHALL automatically create a Gemini Context Cache using the SDK's
caching APIs when the total token count of the system prompt and conversation
prefix exceeds a configurable threshold (defaulting to 32,768 tokens) to
optimize API usage.

#### Scenario: Prompt exceeds caching threshold

- **WHEN** the agent initiates a conversation turn and the calculated token
  count of the system prompt and context prefix is 35,000 tokens (exceeding the
  32,768 threshold)
- **THEN** the system SHALL invoke the Gemini Caching API to create a context
  cache, retrieve the unique Cache ID, and bind it to the conversation request.

### Requirement: Cache Reuse and TTL Management

The system SHALL manage the Time-To-Live (TTL) of the generated context cache
(defaulting to 5 minutes / 300 seconds) and reuse the cache ID for subsequent
prompts as long as the prompt prefix remains identical.

#### Scenario: Sub-sequent turn reuse within TTL

- **WHEN** a new turn is executed within 2 minutes of cache creation and the
  cached prompt prefix is identical to the active system prompt
- **THEN** the system SHALL reuse the existing Cache ID in the API request
  rather than generating a new context cache.
