# provider-catalog Specification

## Requirements

### Requirement: ProviderConfig exposes availableModels field

The `ProviderConfig` interface in
`packages/core/src/services/providerRegistry.ts` MUST include an optional
`availableModels?: string[]` field. The field MUST be optional (not required) to
preserve backward compatibility with existing provider entries that omit it.

#### Scenario: Schema declares availableModels as optional

- **WHEN** TypeScript compiler reads `ProviderConfig`
- **THEN** the interface includes `availableModels?: string[]`
- **THEN** the field is not required (no compile error if omitted)

#### Scenario: Existing provider entries without availableModels still type-check

- **WHEN** code constructs `ProviderConfig` without `availableModels`
- **THEN** TypeScript accepts the construction without error
- **THEN** `getProviderConfig(name).availableModels` returns `undefined`

### Requirement: ProviderRegistry loads availableModels from YAML

`ProviderRegistry.loadFromGlobalConfig` MUST read the `availableModels` field
from each provider entry in `providers.yaml` and store it in the registered
`ProviderConfig`.

#### Scenario: YAML with availableModels list is loaded into registry

- **WHEN** `providers.yaml` contains:
- **THEN** `ProviderRegistry.getProviderConfig('minimax').availableModels` is a
  string array containing exactly
  `["MiniMax-M3", "MiniMax-M2.7", "MiniMax-M2.5"]`
- **THEN** the array order matches the YAML declaration order

#### Scenario: YAML without availableModels is loaded with undefined

- **WHEN** `providers.yaml` contains a provider entry without `availableModels`
- **THEN** `ProviderRegistry.getProviderConfig(name).availableModels` is
  `undefined`
- **THEN** no error or warning is raised

#### Scenario: Env var expansion does not corrupt availableModels

- **WHEN** a provider's `apiKey` uses `${env:VAR}` syntax
- **THEN** `expandEnvVars` substitutes the env var correctly
- **THEN** `availableModels` array is preserved without modification

#### Scenario: Malformed YAML does not throw

- **WHEN** `loadFromGlobalConfig` reads an invalid YAML file
- **THEN** an error is logged via `debugLogger`
- **THEN** the method returns without throwing
- **THEN** the registry state is preserved (no partial corruption)

### Requirement: Backward compatibility preserved

Existing behavior MUST not regress: the `defaultModel` field continues to be
loaded and exposed; all existing tests continue to pass.

#### Scenario: defaultModel still loads

- **WHEN** `providers.yaml` has a `defaultModel` field
- **THEN** `getProviderConfig(name).defaultModel` returns the declared value

#### Scenario: Existing tests pass

- **WHEN** `npm test -w @google/gemini-cli-core` runs
- **THEN** all previously passing tests still pass
- **THEN** new tests for `availableModels` loading also pass
