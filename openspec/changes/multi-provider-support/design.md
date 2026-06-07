## Context

Vesta is currently hard-coded to use the Google GenAI SDK and Gemini-specific message formats. To support other providers, we need to decouple the agent loop from the transport layer. Most modern providers follow either the OpenAI format or the Anthropic format. We will create a unified internal protocol that maps Vesta's needs to these external APIs.

## Goals / Non-Goals

**Goals:**
- Abstract LLM calls into a `Provider` interface.
- Support DeepSeek and Ollama via an OpenAI-compatible adapter.
- Support Anthropic models (Claude) via a dedicated adapter.
- Enable dynamic provider configuration via YAML.

**Non-Goals:**
- Implementing every possible LLM provider immediately (focus on OpenAI-compat and Anthropic first).
- Changing the Ink-based UI to support provider-specific features (UI remains unified).

## Decisions

### 1. Unified Message Format
**Rationale:** We need a common language for chat history.
**Decision:** We will adopt a format heavily inspired by the standard `Content`/`Part` structure but ensuring compatibility with OpenAI's `role`/`content` and Anthropic's message blocks.
**Alternatives:** Converting between provider-specific formats in every turn (messy and error-prone).

### 2. Provider Registry and Factory
**Rationale:** We need to instantiate the correct client based on the model ID.
**Decision:** Create a `ProviderRegistry` that loads `~/.gemini/providers.yaml`. A `ProviderFactory` will then instantiate the appropriate client (e.g., `OpenAiCompatibleProvider`) based on the configuration.

### 3. Model ID Prefixing
**Rationale:** How do we know if a model is Gemini, DeepSeek, or Claude?
**Decision:** Use a provider prefix for external models: `deepseek:deepseek-coder`, `anthropic:claude-3-5-sonnet`, `ollama:qwen2.5`. Default (no prefix) remains `gemini:`.

### 4. Fetch-based Implementation
**Rationale:** Keeping dependencies light.
**Decision:** Instead of importing multiple heavy SDKs, we will implement the OpenAI and Anthropic adapters using raw `fetch` calls, leveraging existing retry logic in Vesta.

## Risks / Trade-offs

- **[Risk] Function Calling Variance** → **Mitigation:** Start with a subset of tools and rigorously test tool-calling mapping between Gemini (function declarations) and OpenAI (tool definitions).
- **[Risk] Token Counting Discrepancy** → **Mitigation:** Use generic token estimators for non-Gemini models until provider-specific tokenizers are integrated.
- **[Risk] API Latency** → **Mitigation:** Maintain the existing async stream support across all providers.
