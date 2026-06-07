## ADDED Requirements

### Requirement: OpenAI API Compatibility
The system SHALL implement an `OpenAiCompatibleProvider` that maps internal message structures to the OpenAI chat completions format.

#### Scenario: Sending a message to DeepSeek
- **WHEN** user sends a task to a "deepseek:" model
- **THEN** the system SHALL send an HTTP POST request to the configured base URL with the OpenAI-formatted payload.

### Requirement: Function Calling Mapping
The system SHALL map Vesta's tool definitions to OpenAI's `tools` array and handle `tool_calls` in the response.

#### Scenario: Tool call from Ollama
- **WHEN** Ollama returns a function call in OpenAI format
- **THEN** the system SHALL parse it into Vesta's internal `FunctionCall` structure.
