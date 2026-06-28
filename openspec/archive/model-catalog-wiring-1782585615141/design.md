# Design: model-catalog-wiring

## Architecture

**Pattern:** Consumer expansion. The data layer
(`ProviderConfig.availableModels`) is already in place. This change wires the
two main consumers to expand the array into UI options.

**Layer:**

- `packages/core/src/services/modelConfigService.ts` —
  `getAvailableModelOptions` loop
- `packages/cli/src/acp/acpUtils.ts` — `buildAvailableModels` (both dynamic +
  legacy paths)

**Rationale:** Single, narrow change at the consumer boundary. No schema, no
loader, no UI redesign.

## Components

| Component                                       | File                                                       | Change                                           |
| ----------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| `ModelConfigService.getAvailableModelOptions`   | `packages/core/src/services/modelConfigService.ts:220-244` | Modified — expand `availableModels` per provider |
| `buildAvailableModels` (dynamic + legacy paths) | `packages/cli/src/acp/acpUtils.ts`                         | Modified — merge external catalog into result    |
| `modelConfigService.externalOptions.test.ts`    | new                                                        | New — unit tests for expansion logic             |
| `acpUtils.externalModels.test.ts`               | new                                                        | New — unit tests for ACP merge                   |

## Data Model

No schema changes. Reuses `ProviderConfig.availableModels?: string[]` (added in
`provider-catalog`).

### Behavior of `getAvailableModelOptions`

```
For each provider in ProviderRegistry:
  if config.availableModels && config.availableModels.length > 0:
    for each model in availableModels:
      emit { modelId: `${name}/${model}`, name: `${name} · ${model}`, tier: 'external' }
  else if config.defaultModel:
    emit { modelId: `${name}/${defaultModel}`, name: `${name} · ${defaultModel}`, tier: 'external' }
  # (provider with neither is skipped — defensive)
```

### Behavior of `buildAvailableModels`

Both code paths (dynamic `getExperimentalDynamicModelConfiguration` and legacy)
call a shared helper that:

1. Computes existing Gemini options (current code).
2. Queries `ProviderRegistry.getInstance().getAllProviders()`.
3. Builds external options (same logic as above).
4. Returns `{ availableModels: [...external, ...gemini], currentModelId }`.

## Test Strategy

| Scenario ID | Test File                                    | Type | Description                                             |
| ----------- | -------------------------------------------- | ---- | ------------------------------------------------------- |
| E1          | `modelConfigService.externalOptions.test.ts` | unit | 3-model catalog → 3 options in order                    |
| E2          | `modelConfigService.externalOptions.test.ts` | unit | no availableModels → 1 defaultModel option              |
| E3          | `modelConfigService.externalOptions.test.ts` | unit | empty `[]` → fallback defaultModel                      |
| E4          | `modelConfigService.externalOptions.test.ts` | unit | 2 providers with catalogs → all entries, registry order |
| E5          | `acpUtils.externalModels.test.ts`            | unit | dynamic path with providers → includes external         |
| E6          | `acpUtils.externalModels.test.ts`            | unit | legacy path with providers → includes external          |
| E7          | `acpUtils.externalModels.test.ts`            | unit | empty registry → no external options, no error          |

All tests use `ProviderRegistry.getInstance().clear()` + `registerProvider()`
for isolation. No global state pollution.

## Dependencies

None.

## Migration

No breaking changes. External catalog expansion is additive. Providers without
`availableModels` keep producing 1 default option.

## Rollback

Revert 4 file changes (2 source + 2 test). No data migration.
