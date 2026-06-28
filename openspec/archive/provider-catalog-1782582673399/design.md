# Design: provider-catalog

## Architecture

**Pattern:** Additive schema extension. No architectural shift —
`ProviderConfig` gains an optional field, the loader spreads it through, and a
new test guards the loading behavior.

**Layer:** `packages/core/src/services/providerRegistry.ts` (the sole owner of
the YAML→object mapping). No changes to `ModelConfigService` or `/model` command
in this change; those are downstream consumers of `availableModels` and are
explicitly out-of-scope.

**Rationale:** Keeping the change scoped to the data layer minimizes risk. Once
the registry exposes `availableModels`, follow-up changes can wire it into the
model-selection UI without further core-schema churn.

## Components

| Component                               | File                                                  | Change Type                                                   |
| --------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| `ProviderConfig` interface              | `packages/core/src/services/providerRegistry.ts`      | Modified — add optional `availableModels` field               |
| `ProviderRegistry.loadFromGlobalConfig` | `packages/core/src/services/providerRegistry.ts`      | Modified — spread `availableModels` into registered config    |
| `providers.yaml` (local)                | `~/.gemini-vesta/providers.yaml`                      | Modified — add `availableModels` lists for 5 active providers |
| `providerRegistry.test.ts`              | `packages/core/src/services/providerRegistry.test.ts` | New — unit tests for YAML loading behavior                    |

## Data Model

### Interface change

```typescript
// packages/core/src/services/providerRegistry.ts
export interface ProviderConfig {
  type: 'openai-compatible' | 'anthropic' | 'google';
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  customHeaders?: Record<string, string>;
  availableModels?: string[]; // <-- NEW: optional
}
```

### Loader change

In `loadFromGlobalConfig`, the spread that builds `expandedConfig` already
includes all fields from `config`. Since `parseYaml` returns the full YAML
structure (loose parsing — to be verified by test), `availableModels` is already
passed through. **No code change strictly required for the loader** if
`parseYaml` is loose. However, we will explicitly destructure to make the field
visible and add a type-narrowing check.

```typescript
const expandedConfig: ProviderConfig = {
  ...config,
  apiKey: config.apiKey ? expandEnvVars(config.apiKey, process.env) : undefined,
  baseUrl: config.baseUrl
    ? expandEnvVars(config.baseUrl, process.env)
    : undefined,
};
// availableModels is preserved by the spread above
```

### YAML schema

```yaml
providers:
  deepseek:
    type: openai-compatible
    baseUrl: https://api.deepseek.com
    apiKey: ${env:DEEPSEEK_API_KEY}
    defaultModel: deepseek-v4-flash
    availableModels: # <-- NEW
      - deepseek-v4-flash
      - deepseek-v4-pro
```

Same pattern applied to `minimax`, `groq`, `opencode`, `xiaomi`. The `claude`
entry stays commented and is not given `availableModels`.

## Test Strategy

| Scenario ID | Test File                  | Type | Description                                                                 |
| ----------- | -------------------------- | ---- | --------------------------------------------------------------------------- |
| S1.1        | `providerRegistry.test.ts` | unit | Loads YAML with `availableModels` → registry has the list in declared order |
| S1.2        | `providerRegistry.test.ts` | unit | YAML without `availableModels` → field is `undefined`, no throw             |
| S1.3        | `providerRegistry.test.ts` | unit | Env var expansion doesn't corrupt `availableModels`                         |
| S1.4        | `providerRegistry.test.ts` | unit | Malformed YAML → error logged, no throw, registry state preserved           |

**Test approach:** Mock `fs.readFileSync` and `Storage.getGlobalGeminiDir` (or
use a tmpdir + `VESTA_DIR` override) to feed test YAML strings. Assert
`getProviderConfig(name).availableModels`.

**No integration test:** The change is data-layer only; consumer integration
(`ModelConfigService`) is out of scope.

**No e2e test:** `/model` command change is out of scope.

## Dependencies

- None. No new packages. No new external APIs.
- Reuses existing `parseYaml` and `expandEnvVars` utilities.

## Migration

**Breaking changes:** None.

**Data migration:** None — `availableModels` is optional. Existing
`providers.yaml` files without it continue to work; the field is `undefined` and
downstream code must handle that.

**Rollout:** The change is in `packages/core` which is part of the monorepo.
Standard `npm run build` rebuilds the core package. No CLI restart logic
required beyond the next normal startup.

**Rollback:** Revert the three commits: schema field, loader no-op (which is
just a comment), YAML update.
