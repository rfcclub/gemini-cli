## MODIFIED Requirements

### Requirement: ModelConfigService.getAvailableModelOptions expands availableModels

The method MUST emit one option per entry in `ProviderConfig.availableModels`
when the array is non-empty. When the array is missing or empty, the method MUST
fall back to a single option using `defaultModel` (legacy behavior).

#### Scenario: Provider with non-empty availableModels emits one option per model

- **WHEN** `ProviderRegistry` contains provider `minimax` with
  `availableModels: [MiniMax-M3, MiniMax-M2.7, MiniMax-M2.5]`
- **THEN** the returned options include three entries with `modelId` values
  `minimax/MiniMax-M3`, `minimax/MiniMax-M2.7`, `minimax/MiniMax-M2.5`
- **AND** the order matches the YAML declaration order
- **AND** each option has `tier: 'external'`

#### Scenario: Provider without availableModels emits one default option

- **WHEN** `ProviderRegistry` contains provider `legacy-provider` with no
  `availableModels` field and `defaultModel: 'some-model'`
- **THEN** the returned options include exactly one entry with
  `modelId: 'legacy-provider/some-model'`
- **AND** the option has `tier: 'external'`

#### Scenario: Provider with empty availableModels array falls back to default

- **WHEN** `ProviderRegistry` contains provider `empty-catalog` with
  `availableModels: []` and `defaultModel: 'some-model'`
- **THEN** the returned options include exactly one entry with
  `modelId: 'empty-catalog/some-model'`

#### Scenario: Multiple providers produce options in registry iteration order

- **WHEN** `ProviderRegistry` contains two providers, each with multiple models
- **THEN** the returned options contain all entries from the first provider,
  then all entries from the second provider
- **AND** within each provider, model order is preserved

## ADDED Requirements

### Requirement: ACP buildAvailableModels merges external catalog

`buildAvailableModels` in `packages/cli/src/acp/acpUtils.ts` MUST include
options derived from `ProviderRegistry` external providers. This applies to both
the dynamic and legacy code paths.

#### Scenario: ACP path includes external options alongside Gemini

- **WHEN** `buildAvailableModels` is called with a config that has external
  providers in `ProviderRegistry`
- **THEN** the returned `availableModels` array contains both Gemini options and
  external options
- **AND** external options are present regardless of whether the dynamic or
  legacy path is taken

#### Scenario: ACP path with no external providers behaves as before

- **WHEN** `ProviderRegistry` is empty
- **THEN** `buildAvailableModels` returns only the existing Gemini options
- **AND** no error is raised

### Requirement: Backward compatibility

Existing behavior MUST not regress: providers without `availableModels` continue
to produce a single `defaultModel` option; existing golden tests continue to
pass (with golden file update if necessary and documented).

#### Scenario: Existing golden test for modelConfigService passes

- **WHEN**
  `npm test -w @google/gemini-cli-core -- src/services/modelConfig.golden.test.ts`
  runs
- **THEN** the test passes (golden file updated if shape changed; update
  documented in change notes)

#### Scenario: Existing acpSessionManager tests pass

- **WHEN**
  `npm test -w @google/gemini-cli-core -- src/acp/acpSessionManager.test.ts`
  runs
- **THEN** all previously passing tests still pass
