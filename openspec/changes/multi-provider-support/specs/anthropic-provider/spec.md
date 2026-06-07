## ADDED Requirements

### Requirement: Anthropic API Implementation
The system SHALL implement an `AnthropicProvider` that maps internal message structures to the Anthropic Messages API format.

#### Scenario: Sending a message to Claude
- **WHEN** model ID is "anthropic:claude-3-5-sonnet"
- **THEN** the system SHALL send an HTTP request to the Anthropic API with the correct headers and block-based content.

### Requirement: Block-based Tool Use
The system SHALL support Anthropic's `tool_use` and `tool_result` content blocks.

#### Scenario: Claude uses a tool
- **WHEN** Anthropic returns a `tool_use` block
- **THEN** the system SHALL execute the tool and return a `tool_result` block in the next turn.
