## 1. Core Cache Management Integration

- [x] 1.1 Create `CacheManager` service under
      `packages/core/src/caching/cacheManager.ts` to handle creation, renewal,
      and checking of Gemini Context Caches.
- [x] 1.2 Implement caching token size threshold detection (defaulting to 32,768
      tokens) and automated TTL extension strategies.
- [x] 1.3 Write comprehensive unit tests for `CacheManager` to verify correct
      caching behavior and mock API interactions.

## 2. Prompt Restructuring & Binding

- [x] 2.1 Refactor `PromptProvider` to separate immutable system prompts
      (Athanor BOOT/AXIOMS/PREFACE, Core Mandates) from dynamic suffix
      components (active topic, tracker files).
- [x] 2.2 Bind the generated static prefix to `CacheManager` when the calculated
      size exceeds the threshold to ensure maximum prefix sharing.
- [x] 2.3 Update existing tests in `promptProvider.test.ts` and add validation
      to ensure zero dynamic values enter the cached static prefix.

## 3. Telemetry Tracking & TUI Componentry

- [ ] 3.1 Implement a telemetry collection hook inside `packages/core` to
      capture `cachedContentTokenCount` from API response metadata.
- [ ] 3.2 Create `CacheTelemetryView.tsx` under `packages/cli/src/ui/components`
      using Ink React to display status and savings.
- [ ] 3.3 Integrate `CacheTelemetryView` into the CLI shell output layout,
      utilizing HSL-themed visual indicators (e.g. Athanor Hot / Cache Hit).
- [ ] 3.4 Verify the entire pipeline with integration tests, checking that TUI
      renders correct saved token counts on cache hits.
