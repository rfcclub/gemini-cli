## ADDED Requirements

### Requirement: Default Model Resolution Priority Chain

The CLI SHALL resolve the default model using a strict 4-tier priority chain.
Higher tiers override lower tiers. The resolved value MUST be a valid
`provider/model` string or the resolution MUST fail with a typed error.

#### Scenario: VESTA_DEFAULT_MODEL env overrides everything

- **WHEN** env `VESTA_DEFAULT_MODEL=groq/llama-3.1-70b` is set
- **AND** `~/.gemini-vesta/config.yaml` has
  `defaultModel: deepseek/deepseek-chat`
- **AND** `providers.yaml` has 5 providers registered
- **THEN** `resolveDefaultModel()` returns `ProviderModelId` where
  `provider = "groq"` AND `model = "llama-3.1-70b"`
- **AND** the resolution source is tagged as `"env"` for logging.

#### Scenario: config.yaml.defaultModel overrides catalog order

- **WHEN** env `VESTA_DEFAULT_MODEL` is not set
- **AND** `~/.gemini-vesta/config.yaml` exists with
  `defaultModel: deepseek/deepseek-chat`
- **AND** `providers.yaml` has 5 providers where deepseek is not first
- **THEN** `resolveDefaultModel()` returns `ProviderModelId` where
  `provider = "deepseek"` AND `model = "deepseek-chat"`
- **AND** the resolution source is tagged as `"config"`.

#### Scenario: catalog first provider used when no config

- **WHEN** env `VESTA_DEFAULT_MODEL` is not set
- **AND** `~/.gemini-vesta/config.yaml` does not exist
- **AND** `providers.yaml` exists with `providers[0] = groq` and
  `groq.availableModels[0] = llama-3.1-70b`
- **THEN** `resolveDefaultModel()` returns `ProviderModelId` where
  `provider = "groq"` AND `model = "llama-3.1-70b"`
- **AND** the resolution source is tagged as `"catalog"`.

#### Scenario: fallback to first provider with warning when no sources

- **WHEN** env `VESTA_DEFAULT_MODEL` is not set
- **AND** `~/.gemini-vesta/config.yaml` does not exist
- **AND** `providers.yaml` has 1 provider with availableModels
- **THEN** `resolveDefaultModel()` returns that provider's first model
- **AND** logs warning
  `WARN: No config.yaml found. Auto-selected <provider>/<model> from providers.yaml.`
- **AND** the resolution source is tagged as `"fallback"`.

#### Scenario: fail with typed error when providers.yaml does not exist

- **WHEN** env `VESTA_DEFAULT_MODEL` is not set
- **AND** `~/.gemini-vesta/config.yaml` does not exist
- **AND** `providers.yaml` does not exist
- **THEN** `resolveDefaultModel()` throws `NoProvidersConfiguredError`
- **AND** error message contains the string
  `"No providers configured. Run \`vesta init-providers\` or set
  GEMINI_API_KEY."`.

#### Scenario: fail with typed error when providers.yaml has zero providers

- **WHEN** env `VESTA_DEFAULT_MODEL` is not set
- **AND** `~/.gemini-vesta/config.yaml` does not exist
- **AND** `providers.yaml` exists with zero providers
- **THEN** `resolveDefaultModel()` throws `NoProvidersConfiguredError`
- **AND** error message contains the string
  `"No providers configured. Run \`vesta init-providers\` or set
  GEMINI_API_KEY."`.

### Requirement: CLI Flag Override

The CLI SHALL accept a `--provider <name>` flag that overrides the resolver
chain for the current invocation only. The flag MUST take precedence over env,
config, and catalog.

#### Scenario: --provider flag overrides env

- **WHEN** user runs `gemini-vesta --provider deepseek`
- **AND** env `VESTA_DEFAULT_MODEL=groq/llama-3.1-70b` is set
- **THEN** the CLI uses the first available model from the `deepseek` provider
- **AND** logs `INFO: --provider flag active: deepseek`.

#### Scenario: --provider with unknown provider fails clearly

- **WHEN** user runs `gemini-vesta --provider nonexistent-provider`
- **THEN** the CLI exits with non-zero status before any chat session starts
- **AND** error message contains the string
  `"Unknown provider 'nonexistent-provider'. Available: "` followed by a
  comma-separated list of registered provider names.

### Requirement: Opt-in Gemini Registration

The ProviderRegistry SHALL NOT register the `gemini` provider unless
`GEMINI_API_KEY` env var is set to a non-empty string. This is the ONLY
requirement that changes existing Gemini registration behavior.

#### Scenario: GEMINI_API_KEY unset — Gemini not registered

- **WHEN** env `GEMINI_API_KEY` is unset
- **AND** ProviderRegistry initialization runs
- **THEN** `providerRegistry.getAllProviders()` does NOT include `"gemini"`
- **AND** `providerRegistry.getProviderConfig("gemini")` returns `undefined`.

#### Scenario: GEMINI_API_KEY empty string — Gemini not registered

- **WHEN** env `GEMINI_API_KEY` is set to empty string
- **AND** ProviderRegistry initialization runs
- **THEN** `providerRegistry.getAllProviders()` does NOT include `"gemini"`
- **AND** `providerRegistry.getProviderConfig("gemini")` returns `undefined`.

#### Scenario: GEMINI_API_KEY present — Gemini registered as opt-in

- **WHEN** env `GEMINI_API_KEY="valid-key"` is set
- **AND** ProviderRegistry initialization runs
- **THEN** `providerRegistry.getAvailableProviders()` includes `"gemini"`
- **AND** `providerRegistry.getProvider("gemini")` returns a provider object
  with `apiKey = "valid-key"` (redacted in logs).

#### Scenario: backward compat — Gemini remains default when key present

- **WHEN** env `GEMINI_API_KEY="valid-key"` is set
- **AND** `~/.gemini-vesta/config.yaml` does not exist
- **AND** `VESTA_DEFAULT_MODEL` is not set
- **AND** `providers.yaml` does not exist
- **THEN** `resolveDefaultModel()` returns the default Gemini model identifier
  (e.g., `gemini/gemini-2.5-pro`)
- **AND** this preserves the pre-change behavior exactly.

### Requirement: VestaConfig Loader

The system SHALL provide `loadVestaConfig()` that reads
`~/.gemini-vesta/config.yaml`, validates schema, and returns a typed config
object. Missing config MUST return `null`, not throw.

#### Scenario: valid config.yaml loads successfully

- **WHEN** `~/.gemini-vesta/config.yaml` exists with valid `defaultModel`,
  `defaultProvider`, optional `geminiApiKey`
- **THEN** `loadVestaConfig()` returns `VestaConfig` with all fields populated
  as parsed values
- **AND** parsed YAML matches the Zod-style schema:
  `{ defaultModel?: string, defaultProvider?: string, geminiApiKey?: string }`.

#### Scenario: missing config returns null

- **WHEN** `~/.gemini-vesta/config.yaml` does not exist
- **THEN** `loadVestaConfig()` returns `null`
- **AND** does not log any error or warning.

#### Scenario: invalid config.yaml throws typed error

- **WHEN** `~/.gemini-vesta/config.yaml` exists with malformed YAML (e.g.,
  duplicate key, invalid type)
- **THEN** `loadVestaConfig()` throws `VestaConfigParseError` with the
  underlying YAML parser error message.

#### Scenario: config.yaml with API key warns on loose permissions

- **WHEN** `~/.gemini-vesta/config.yaml` exists with `geminiApiKey` field
  populated
- **AND** file permissions are `0644` (world-readable)
- **THEN** `loadVestaConfig()` returns the config successfully
- **AND** logs warning
  `WARN: config.yaml contains API key but permissions are 0644. Run: chmod 600 ~/.gemini-vesta/config.yaml`.

### Requirement: Boot Logging

The CLI SHALL log the resolved default model and its source during boot, before
any user interaction. Log format MUST be parseable by `grep` and MUST NOT
include API keys.

#### Scenario: successful boot logs source clearly

- **WHEN** the CLI resolves a default model successfully
- **THEN** logs a single line:
  `INFO: Default model resolved: <provider>/<model> (source: <env|config|catalog|fallback|gemini-default>)`.

#### Scenario: failed boot logs actionable recovery steps

- **WHEN** `resolveDefaultModel()` throws `NoProvidersConfiguredError`
- **THEN** the CLI logs the error message verbatim
- **AND** exits with status code 78 (`EX_CONFIG` from sysexits.h).

### Requirement: Integration Test — Boot Without GEMINI_API_KEY

A new integration test SHALL verify that the CLI boots successfully end-to-end
without `GEMINI_API_KEY`, using only catalog models. This test MUST be added to
`integration-tests/`.

#### Scenario: unset GEMINI_API_KEY and providers.yaml only

- **WHEN** `GEMINI_API_KEY` env is unset
- **AND** `~/.gemini-vesta/providers.yaml` exists with ≥1 provider
- **AND** `~/.gemini-vesta/config.yaml` does not exist
- **THEN** `gemini-vesta --version` exits with status 0
- **AND** `gemini-vesta --help` lists `--provider <name>` in available options.

#### Scenario: full boot sequence without GEMINI_API_KEY

- **WHEN** `GEMINI_API_KEY` env is unset
- **AND** `providers.yaml` exists with 1 provider
- **AND** config.yaml does not exist
- **THEN** invoking `gemini-vesta` with `--prompt "echo hi"` exits with status 0
- **AND** the captured stdout/stderr contains the substring
  `"Default model resolved:"` and the provider's first model name.
