## Why

Gemini CLI's existing `auto` model alias routes prompts through a Gemini-based
classifier (`gemini-2.5-pro` by default) that only knows `pro`/`flash` Gemini
variants. Users running Vesta with multiple external providers registered in
`~/.gemini/providers.yaml` (e.g. `minimax:MiniMax-M3`,
`deepseek:deepseek-v4-pro`, `xiaomi:mimo-v2.5-pro`) cannot benefit from
auto-routing — the classifier is Gemini-only and invisible to external
providers. This change introduces an opt-in `auto:vesta` alias that routes
locally via deterministic heuristics over per-provider `capabilities` metadata.

## What Changes

- Extend `ProviderConfig` (in `packages/core/src/services/providerRegistry.ts`)
  with an optional `capabilities` block (`reasoning`, `speed`, `costTier`,
  `contextWindow`, `supportsTools`). Purely additive — providers without
  capabilities continue to work.
- Add `packages/core/src/services/vestaRouter.ts` exposing
  `classifyIntent(prompt)` and
  `pickModelForIntent(prompt, providers, userDefault)`. Pure functions, no
  network, no LLM calls.
- Register the alias `auto:vesta` in `ModelConfigService.resolveModelId` and
  `ProviderFactory.getProvider`. When seen, callers route through
  `VestaRouter.pickModelForIntent` and cache the decision per turn on `Config`.
- Add `Auto (Vesta)` entry to the dynamic main view in `ModelDialog.tsx`, above
  `Manual`, with description explaining the routing policy.
- Update `~/.gemini/providers.yaml` example doc in
  `openspec/changes/multi-provider-support/specs/provider-registry/spec.md` to
  mention `capabilities` as optional metadata.
- Add unit tests for `VestaRouter` (intent classification matrix + scoring
  matrix + fallback) and an integration test for `auto:vesta` alias resolution.

## Capabilities

### New Capabilities

- `vesta-router`: Intent classification + provider scoring for the `auto:vesta`
  alias. Defines `VestaRouter` API, heuristics, capability schema, fallback
  chain.
- `provider-capabilities`: Optional `capabilities` field on `ProviderConfig` and
  `providers.yaml` schema. Defines fields, defaults, and validation rules.
- `model-alias-auto-vesta`: Registration of the `auto:vesta` alias through
  `ModelConfigService` and `ProviderFactory`. Defines resolution semantics and
  caching.

### Modified Capabilities

- `provider-registry`: The existing `providers.yaml` schema gains an optional
  `capabilities` block per provider. Existing providers without `capabilities`
  keep working; load-time warning (not error) when missing.

## Impact

- **Code**:
  - `packages/core/src/services/providerRegistry.ts` — add
    `ProviderCapabilities` interface + optional field on `ProviderConfig`.
  - `packages/core/src/services/modelConfigService.ts` — register `auto:vesta`
    resolution path.
  - `packages/core/src/services/vestaRouter.ts` — new module.
  - `packages/core/src/core/providerFactory.ts` — handle `auto:vesta` prefix.
  - `packages/core/src/core/baseLlmClient.ts` — call `VestaRouter` when model
    resolves to `auto:vesta` (after dynamic model resolution).
  - `packages/cli/src/ui/components/ModelDialog.tsx` — add `Auto (Vesta)` entry
    above `Manual` in dynamic main view.
- **APIs**:
  - New: `VestaRouter.classifyIntent`, `VestaRouter.pickModelForIntent`,
    `ProviderRegistry.getProviderCapabilities(name)`.
  - No breaking changes.
- **Dependencies**: None added in this phase.
- **Settings**: No new settings keys required. Future flag
  `settings.experimental.vestaRouter` reserved but not implemented.
- **Docs**:
  `openspec/changes/multi-provider-support/specs/provider-registry/spec.md`
  example updated.
