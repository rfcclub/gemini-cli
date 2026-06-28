# Implementation Plan: model-catalog-wiring

## Tasks

### Task 1: RED — test for getAvailableModelOptions expansion

- [ ] Create
      `packages/core/src/services/modelConfigService.externalOptions.test.ts`
- [ ] Test E1: provider with 3-model catalog → 3 options
- [ ] Test E2: provider without availableModels → 1 defaultModel option
- [ ] Test E3: provider with `[]` → fallback
- [ ] Test E4: 2 providers → all options, registry order

Run:
`npx vitest run packages/core/src/services/modelConfigService.externalOptions.test.ts`
Expected: FAIL (current impl only emits 1 per provider)

### Task 2: GREEN — expand getAvailableModelOptions

- [ ] In `modelConfigService.ts:220-244`, replace `externalOptions` map with a
      helper function `buildExternalProviderOptions(providers)` that emits 1
      option per model when `availableModels` is non-empty, else falls back to
      `defaultModel`.
- [ ] Call the helper from `getAvailableModelOptions`.

Run:
`npx vitest run packages/core/src/services/modelConfigService.externalOptions.test.ts`
Expected: PASS

### Task 3: RED — test for ACP buildAvailableModels

- [ ] Create `packages/cli/src/acp/acpUtils.externalModels.test.ts`
- [ ] Test E5: dynamic path includes external
- [ ] Test E6: legacy path includes external
- [ ] Test E7: empty registry → no external, no error

Run: `npx vitest run packages/cli/src/acp/acpUtils.externalModels.test.ts`
Expected: FAIL

### Task 4: GREEN — merge external catalog in buildAvailableModels

- [ ] In `acpUtils.ts`, extract a helper `buildExternalModelOptions()` that
      returns options from `ProviderRegistry`.
- [ ] In `buildAvailableModels`, call helper and merge into both dynamic +
      legacy return paths.

Run: `npx vitest run packages/cli/src/acp/acpUtils.externalModels.test.ts`
Expected: PASS

### Task 5: Regression + verify

- [ ] Run full services + acp test suites
- [ ] `npm run typecheck -w @google/gemini-cli-core`
- [ ] `npm run lint -w @google/gemini-cli-core -- src/services/modelConfigService.ts packages/cli/src/acp/acpUtils.ts`
- [ ] Write `.traceability.yaml`
- [ ] `loomkit verify model-catalog-wiring`
- [ ] `loomkit archive model-catalog-wiring`
