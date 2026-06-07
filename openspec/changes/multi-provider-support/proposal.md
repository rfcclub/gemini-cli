## Why

To transform Gemini-Vesta from a Gemini-locked tool into a Universal AI Forge capable of orchestrating multiple LLM providers (DeepSeek, OpenAI, Anthropic, Ollama). This enables Thoor to use the best model for each specific task (e.g., DeepSeek for coding, Gemini for analysis) and reduces dependency on a single ecosystem.

## What Changes

- **Universal Provider Adapter**: A new abstraction layer for LLM communication.
- **Provider-agnostic Messaging**: Internal representation of chat history and tools.
- **External Provider Configuration**: Support for `~/.gemini/providers.yaml` to define API keys and base URLs.
- **OpenAI-compatible Client**: Generic client for DeepSeek, Groq, Ollama, etc.
- **Anthropic Client**: Specialized client for Claude models.
- **Smart Routing (Provider-aware)**: Model router logic updated to handle cross-provider escalation.

## Capabilities

### New Capabilities
- `llm-adapter-layer`: The interface and base class for all LLM providers.
- `openai-provider`: Implementation for OpenAI and compatible APIs (DeepSeek, Ollama).
- `anthropic-provider`: Implementation for Claude models.
- `provider-registry`: Management of external provider configurations from YAML/JSON.

### Modified Capabilities
- `base-llm-client`: Refactored to use the new adapter layer.
- `model-router`: Updated to resolve models across different providers.

## Impact

- `packages/core`: Core logic for LLM communication will be abstracted.
- `packages/cli`: Configuration loading and status display will include provider info.
- Infrastructure: New dependencies for standard LLM client protocols (likely `openai` and `anthropic` SDKs, or raw fetch implementations).
- **BREAKING**: Existing low-level Gemini-specific internal APIs may be deprecated in favor of the universal adapter.
