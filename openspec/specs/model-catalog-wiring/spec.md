# model-catalog-wiring Specification

## Requirements

### Requirement: ACP buildAvailableModels merges external catalog

`buildAvailableModels` in `packages/cli/src/acp/acpUtils.ts` MUST include
options derived from `ProviderRegistry` external providers. This applies to both
the dynamic and legacy code paths.

#### Scenario: ACP path includes external options alongside Gemini

- **WHEN** `buildAvailableModels` is called with a config that has external
  providers in `ProviderRegistry`
- **THEN** the returned `availableModels` array contains both Gemini options and
  external options
- **THEN** external options are present regardless of whether the dynamic or
  legacy path is taken

#### Scenario: ACP path with no external providers behaves as before

- **WHEN** `ProviderRegistry` is empty
- **THEN** `buildAvailableModels` returns only the existing Gemini options
- **THEN** no error is raised

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
