## Why

Gemini-Vesta utilizes a large context window and extensive prompt configurations
(including the custom Vesta Athanor files, user instruction files, and
repository-wide contexts). As conversations grow longer, the token count per
prompt increases linearly, leading to higher API consumption costs, potential
rate limit throttling, and increased latency (often taking 5-10+ seconds for
subsequent turns).

Implementing automated **Gemini Context Caching** (Prompt Caching) will solve
these pain points by caching the system prompt, Vesta Athanor layers, and
initial repository directory state. This will cut API token costs by up to
80-90% for subsequent turns and reduce API response latency to ~1-2 seconds,
creating a premium and lightning-fast developer experience.

## What Changes

- **Core API Layer Upgrades**: Support creating, retrieving, and auto-refreshing
  Gemini Context Caches using the `@google/genai` SDK cache APIs.
- **Automated Caching Logic**: Integrate caching logic in the agent's turn
  generation loop. When the system prompt or history passes a certain token
  threshold (e.g., 32k tokens), automatically register a context cache.
- **Vesta Athanor Cache Binding**: Explicitly bundle the system prompt,
  including the Vesta Athanor boot sequences, into the cached prefix since these
  remain static throughout the session.
- **Telemetry & Cost Dashboard**: Add real-time stats in the Ink TUI to show
  cache utilization status (Cache Hit, Cache Miss, Active Cache TTL, and Token
  Savings metrics).

## Capabilities

### New Capabilities

- `context-caching`: Automatically manage, recycle, and refresh Gemini Context
  Caches based on system prompt size and TTL.
- `caching-telemetry`: Monitor and render caching health, hit rate, and session
  token savings metrics directly in the Ink terminal interface.

### Modified Capabilities

_(None)_

## Impact

- **Core Package (`packages/core`)**:
  `packages/core/src/prompts/promptProvider.ts` will need to structure prompt
  sections to maximize prefix sharing. A new caching service/manager will be
  introduced to communicate with the Gemini Caching API.
- **CLI Package (`packages/cli`)**: The Ink TUI components will be modified to
  display real-time caching status and metrics in the terminal interface.
- **Dependencies**: Requires support for the context caching endpoints in the
  `@google/genai` or standard Google AI SDK.
