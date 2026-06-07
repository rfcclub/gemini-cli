## 1. Abstraction Layer

- [x] 1.1 Define the `LlmProvider` interface in `packages/core/src/core/types.ts`.
- [x] 1.2 Implement the `ProviderFactory` and `ProviderRegistry`.
- [x] 1.3 Refactor `BaseLlmClient` to delegate to a `LlmProvider` instance.

## 2. Configuration System

- [x] 2.1 Add YAML parsing support for `~/.gemini/providers.yaml`.
- [x] 2.2 Implement environment variable expansion for configuration values.
- [x] 2.3 Integrate provider loading into the `loadSettings` lifecycle.

## 3. OpenAI Compatible Provider

- [x] 3.1 Implement `OpenAiCompatibleProvider` using `fetch`.
- [x] 3.2 Add mapping logic for OpenAI tool/function calling.
- [x] 3.3 Verify compatibility with DeepSeek and Ollama endpoints.

## 4. Anthropic Provider

- [x] 4.1 Implement `AnthropicProvider` using `fetch`.
- [x] 4.2 Add mapping logic for Anthropic content blocks and tool use.
- [ ] 4.3 Implement streaming support for the Anthropic protocol.

## 5. Integration and Testing

- [x] 5.1 Update `ModelRouter` to resolve prefixed model IDs.
- [x] 5.2 Add unit tests for each provider adapter.
- [x] 5.3 Add an integration test for cross-provider model switching.
