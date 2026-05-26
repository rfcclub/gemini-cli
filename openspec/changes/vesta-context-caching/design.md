## Context

Gemini-Vesta aggregates static system instructions, Vesta Athanor files, dynamic
workspace files, and historical turns for every user prompt execution. This
prefix matches the caching pattern recommended by the Gemini API (which caches
static prefixes of length > 32,768 tokens). The design focuses on splitting the
system prompt generation into a strict **Static prefix** (cacheable) and a
**Dynamic suffix** (non-cacheable) to maximize cache hit rates, while
integrating real-time telemetry into the CLI rendering layer.

## Goals / Non-Goals

**Goals:**

- Implement a dedicated `CacheManager` service in `packages/core` to handle
  creation, TTL, and tracking of Gemini Context Caches using the `@google/genai`
  SDK.
- Restructure `PromptProvider` in `packages/core` to separate the system prompt
  into a static portion (System prompt + Athanor axioms + static workflows) and
  a dynamic portion (active topic, tracker files, active command inputs).
- Update the Ink terminal interface (`packages/cli`) to render premium caching
  telemetry.

**Non-Goals:**

- Creating shared cache stores across different physical machines (caching
  remains local to the active environment).
- Persisting caches past their API-defined maximum TTL (typically 24 hours,
  defaulting to 5 minutes for active development loops).

## Decisions

### 1. Separate Prompt Generation into Static Prefix & Dynamic Suffix

- **Context**: If any part of the cached prefix changes (even a single character
  like the active timestamp or active topic), the entire cache misses.
- **Decision**: Restructure `packages/core/src/prompts/promptProvider.ts` to
  strictly segregate the immutable system instructions (Athanor
  BOOT/AXIOMS/PREFACE, Core Mandates, static Workflows) from the mutable
  execution context (Active topic, active tasks tracker, latest user prompts).
- **Rationale**: This guarantees that the cached prefix remains identical across
  hundreds of turns, achieving a 95%+ cache hit rate.

### 2. CacheManager Service with TTL Autorefresh

- **Context**: Gemini Context Caches have a default TTL of 5 minutes. If a
  session is active, we want to renew the TTL.
- **Decision**: Create a `CacheManager` class in `packages/core` that
  automatically renews the TTL of the active cache using `update` API calls on
  subsequent hits, avoiding the overhead of creating new caches.
- **Alternatives Considered**: Creating a new cache on every turn. Rejected due
  to API call overhead and higher creation costs.

### 3. Integrated Telemetry in Ink React CLI

- **Context**: The user needs to see the caching metrics to verify efficiency.
- **Decision**: Add a premium custom component `CacheTelemetryView.tsx` under
  `packages/cli/src/ui/components` rendered using Ink React.
- **Rationale**: Beautifully aligns with Vesta's aesthetic design principles by
  rendering theme-colored telemetry bars (using green/teal colors for "Athanor
  Hot / Cache Hit" and blue/cyan for "Savings").

## Risks / Trade-offs

- **Risk: Frequent Cache Misses on Dynamic Variables**
  - _Description_: If dynamic elements (like active task directories) are
    accidentally placed inside the prefix, the cache will miss every time.
  - _Mitigation_: Unit tests in `promptProvider.test.ts` will strictly validate
    that the generated static prefix contains zero dynamic variables (e.g.,
    timestamps or dynamic workspace paths).
