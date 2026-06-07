## ADDED Requirements

### Requirement: LLM Adapter Interface
The system SHALL define a `LlmProvider` interface that abstracts `generateContent`, `generateJson`, and `streamContent` operations.

#### Scenario: Interface definition
- **WHEN** building the core library
- **THEN** all LLM interactions MUST go through the `LlmProvider` interface.

### Requirement: Provider Factory
The system SHALL provide a factory to instantiate the correct provider based on the model ID prefix.

#### Scenario: Resolving DeepSeek
- **WHEN** model ID is "deepseek:deepseek-coder"
- **THEN** the factory SHALL return an `OpenAiCompatibleProvider` instance.
