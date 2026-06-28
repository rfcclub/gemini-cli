## ADDED Requirements

### Requirement: VestaRouter Module

The system SHALL provide a `VestaRouter` module at
`packages/core/src/services/vestaRouter.ts` exporting two pure functions:
`classifyIntent(prompt: string): Intent` and
`pickModelForIntent(prompt: string, providers: ReadonlyArray<ProviderEntry>, userDefault: string): RoutingDecision`.

#### Scenario: classifyIntent returns reasoning for multi-step coding prompts

- **WHEN** the prompt contains a code fence (` ``` `) AND multi-step language
  (matches `/\b(first|then|after|finally|step \d)\b/i`) AND length > 200 chars
- **THEN** `classifyIntent` returns `Intent = 'reasoning'` with confidence >=
  0.7

#### Scenario: classifyIntent returns coding for short code requests

- **WHEN** the prompt contains a code fence AND does NOT contain multi-step
  language AND length <= 800 chars
- **THEN** `classifyIntent` returns `Intent = 'coding'` with confidence >= 0.6

#### Scenario: classifyIntent returns fast for short greetings

- **WHEN** the prompt length <= 40 chars AND does NOT contain code fences
- **THEN** `classifyIntent` returns `Intent = 'fast'` with confidence >= 0.8

#### Scenario: classifyIntent returns reasoning for very long prompts

- **WHEN** the prompt length > 1500 chars AND does NOT match fast/coding
  patterns
- **THEN** `classifyIntent` returns `Intent = 'reasoning'` with confidence >=
  0.6

#### Scenario: classifyIntent returns chat as fallback

- **WHEN** none of the above patterns match
- **THEN** `classifyIntent` returns `Intent = 'chat'` with confidence >= 0.5

#### Scenario: pickModelForIntent returns highest-scoring provider

- **WHEN** `providers` contains 3 entries and intent is `'reasoning'`
- **THEN** `pickModelForIntent` returns the provider with the highest weighted
  score against `reasoning` capability, returned as a `provider/model` string

#### Scenario: pickModelForIntent falls back to userDefault when no confident match

- **WHEN** `providers` is empty
- **THEN** `pickModelForIntent` returns `userDefault` unchanged

#### Scenario: pickModelForIntent uses cost tier as tiebreaker

- **WHEN** two providers have equal primary scores
- **THEN** the provider with lower `costTier` wins

### Requirement: Provider Capabilities Schema

The system SHALL allow each entry in `providers.yaml` to include an optional
`capabilities` block. When omitted, defaults SHALL be applied at router time
(not persisted).

The `capabilities` block SHALL have the following shape:

```yaml
capabilities:
  reasoning: low | mid | high # optional, default 'mid'
  speed: fast | medium | slow # optional, default 'medium'
  costTier: cheap | mid | premium # optional, default 'mid'
  contextWindow: number # optional, default 32000
  supportsTools: boolean # optional, default true
```

#### Scenario: capabilities missing — defaults applied

- **WHEN** a provider is registered without `capabilities`
- **THEN** the router treats it as
  `reasoning: mid, speed: medium, costTier: mid, contextWindow: 32000, supportsTools: true`

#### Scenario: capabilities present — values honored

- **WHEN** a provider declares `capabilities: { reasoning: high }`
- **THEN** the router uses `reasoning: high` for scoring

#### Scenario: load-time warning when capabilities missing

- **WHEN** a provider is loaded without `capabilities`
- **THEN** `debugLogger.warn(...)` is called once at load time; no error is
  thrown

### Requirement: auto:vesta Alias

The system SHALL resolve the model alias `auto:vesta` to a concrete
`provider/model` identifier before any LLM call. Resolution SHALL happen in this
order:

1. Check the per-turn cache on `Config`. If hit, return cached value.
2. Call
   `VestaRouter.pickModelForIntent(currentTurnPrompt, providersFromRegistry, userDefaultModel)`.
3. Store the result in the per-turn cache.
4. Return the resolved `provider/model` string.

#### Scenario: auto:vesta resolves on first call

- **WHEN** `BaseLlmClient.generateContent` is called with `model = 'auto:vesta'`
  and the cache is empty
- **THEN** the call to `VestaRouter.pickModelForIntent` is made exactly once and
  the result is cached

#### Scenario: auto:vesta cache hit returns cached value

- **WHEN** `BaseLlmClient.generateContent` is called twice within the same turn
  with `model = 'auto:vesta'`
- **THEN** the second call returns the cached routing decision;
  `VestaRouter.pickModelForIntent` is NOT called again

#### Scenario: auto:vesta cache resets on new turn

- **WHEN** a new user prompt is submitted (turn boundary)
- **THEN** the routing cache on `Config` is cleared

#### Scenario: legacy auto alias unchanged

- **WHEN** `model = 'auto'` (legacy alias) is used
- **THEN** the existing Gemini classifier path is used unchanged

### Requirement: Auto (Vesta) UI Entry

The system SHALL display `Auto (Vesta)` as the first entry in the `ModelDialog`
dynamic main view when `experimental.dynamicModelConfiguration` is enabled.

#### Scenario: Auto (Vesta) appears above Manual

- **WHEN** the dynamic `ModelDialog` is rendered
- **THEN** the first item is `Auto (Vesta)` and the second item is `Manual`

#### Scenario: selecting Auto (Vesta) persists auto:vesta

- **WHEN** the user selects `Auto (Vesta)` and the dialog closes
- **THEN** `config.setModel('auto:vesta', ...)` is called

#### Scenario: Auto (Vesta) description explains routing

- **WHEN** the dynamic `ModelDialog` is rendered
- **THEN** the description for `Auto (Vesta)` contains the substring "intent"
  (case-insensitive)
