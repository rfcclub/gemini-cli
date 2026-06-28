# Intent: vesta-intent-router

## Raw Request

> "Auto mode cũng hay, tự chọn model theo task, nhưng trình em hiện nay chưa làm
> được, chỉ có thể viết intent"

(Gemini CLI's existing auto mode uses a Gemini classifier that only knows
`pro`/`flash` tokens; it cannot route to external providers registered in
`~/.gemini/providers.yaml` such as `minimax:MiniMax-M3`,
`deepseek:deepseek-v4-pro`, `xiaomi:mimo-v2.5-pro`.)

## Problem

When `model = auto` (or its alias), Gemini CLI delegates routing to an LLM
classifier (`gemini-2.5-pro` by default) that picks between `flash` and `pro`
Gemini variants based on prompt heuristics. This routing layer is:

1. **Gemini-only** — it has no visibility into the external providers registered
   via `~/.gemini/providers.yaml`. Users who disable Gemini (no Google access)
   cannot use auto mode at all.
2. **Token-poor** — only sees `pro`/`flash`; cannot distinguish a "reasoning"
   model (Claude Opus, DeepSeek V4 Pro) from a "fast chat" model (Flash Lite,
   Haiku).
3. **Unverifiable** — routing decisions are made by a black-box LLM call with no
   deterministic fallback. Failures are silent.
4. **Provider-agnostic cost-blind** — cannot prefer cheaper models for simple
   tasks even when the user has registered multiple providers.

## Desired Outcome

A new "Auto (Vesta)" routing mode that:

1. Routes a user prompt to the most appropriate provider/model registered in
   `providers.yaml` using a **local, deterministic, heuristic intent
   classifier** (no extra LLM calls for routing itself).
2. Honors per-provider `capabilities` metadata (reasoning tier, speed, cost
   tier, context window) declared in `providers.yaml`.
3. Falls back deterministically: if the heuristic cannot confidently route,
   picks the provider marked as the user's default in `providers.yaml`
   (currently `minimax:MiniMax-M3`).
4. Caches the routing decision for the duration of one turn so multi-tool-call
   runs stay on the same model (no flapping).
5. Is **visible** to the user: the `/model` dialog surfaces `Auto (Vesta)`
   alongside `Manual` and explains the routing policy.
6. Is **opt-in**: existing `--model auto` behavior is unchanged unless the user
   explicitly sets `--model auto:vesta` (or selects `Auto (Vesta)` from the
   picker).

## Users / Actors

- **Thoor (primary)** — Runs Vesta with multiple external providers configured.
  Wants simple chat to hit the cheap/fast model, but complex multi-step
  coding/refactor tasks to hit the reasoning model, automatically.
- **Vesta** — The agent itself. Needs to call `getModel()` and trust the result.
- **Future providers added via `providers.yaml`** — Should be discoverable by
  the router without code changes, provided the operator declares
  `capabilities`.

## Current Context

Relevant existing components:

- `packages/core/src/services/providerRegistry.ts` — loads
  `~/.gemini/providers.yaml` into a singleton `ProviderRegistry`.
  `ProviderConfig` currently has only `type`, `apiKey`, `baseUrl`,
  `defaultModel`, `customHeaders`.
- `packages/core/src/services/modelConfigService.ts:221-234` — already exposes
  external providers via `getAvailableModelOptions()` with `tier: 'external'`
  (Vesta override landed this session).
- `packages/core/src/core/providerFactory.ts` — resolves a `modelId` (with
  `provider:model` or `provider/model` prefix) to an `LlmProvider` instance.
- `packages/core/src/core/baseLlmClient.ts` + `policyHelpers.ts` — when
  `model === 'auto'`, falls back to classifier-based selection. This is the seam
  where Vesta routing will inject.
- `packages/cli/src/ui/components/ModelDialog.tsx` — already shows `Manual` as
  the only entry in dynamic mode (Vesta override this session). Will add
  `Auto (Vesta)` entry above it.
- `openspec/changes/multi-provider-support/` — existing spec covering provider
  YAML loading; this change **extends** it with capabilities + routing, not
  replaces it.

## Proposed Direction

1. **Extend `ProviderConfig`** with an optional `capabilities` block
   (`reasoning`, `speed`, `costTier`, `contextWindow`, `supportsTools`). All
   fields optional; defaults filled by Vesta router.
2. **New module `packages/core/src/services/vestaRouter.ts`** with two pure
   functions:
   - `classifyIntent(prompt: string): Intent` — heuristic local classifier
     (regex on prompt structure: code fences, multi-step language, length, code
     keywords).
   - `pickModelForIntent(prompt, providers, userDefault): string` — score each
     provider against intent + capabilities, return highest-scoring
     `provider/model` id (or `userDefault` if no confident match).
3. **Alias `auto:vesta`** — register it in the dynamic model resolution layer;
   when seen, BaseLlmClient calls `vestaRouter.pickModelForIntent(...)` once per
   turn and caches the result on the `Config` instance.
4. **UI**: add `Auto (Vesta)` entry to `ModelDialog.tsx` dynamic main view
   (above Manual), with description explaining the routing policy.
5. **Tests**: heuristic edge cases (empty prompt, very long, all-caps,
   multi-language), capability scoring matrix, fallback chain.

## Scope

- Adding `capabilities` field to `ProviderConfig` and `providers.yaml` schema.
- Implementing `VestaRouter` (heuristic + scoring, no LLM-based classifier in
  this phase).
- Alias `auto:vesta` resolved in `ModelConfigService` + `BaseLlmClient`.
- UI entry in `ModelDialog` + 1 integration test.
- Updating `~/.gemini/providers.yaml` example in docs
  (`openspec/changes/multi-provider-support/`).
- Caching decision per turn.

## Non-Goals

- **No LLM-based classifier** in this phase. Heuristic only. (Embedding-based
  semantic router is a future Phase F.)
- **No cost/quota enforcement** — `costTier` is informational; we won't block or
  rate-limit.
- **No multi-model fan-out** (running 2 models in parallel and picking).
  Sequential routing only.
- **No replacement of the existing Gemini classifier** for the legacy `auto`
  alias. Old behavior preserved for users on `auto` who don't switch.
- **No provider auto-discovery** outside `providers.yaml`. (MCP servers, etc.
  stay separate.)
- **No streaming token usage attribution** by provider. We log which provider
  was chosen but not per-token breakdown.

## Constraints

- **Determinism**: same prompt + same providers must always yield the same
  routing decision. No randomness.
- **Local-only**: router MUST NOT make network calls. No fallback LLM. If
  routing fails, fall back to `userDefault`.
- **Latency**: classification + scoring must complete in <5 ms for typical
  prompts (<10k chars).
- **Backward compat**: providers without `capabilities` declared must still work
  — router fills sensible defaults (`reasoning: 'mid'`, `speed: 'medium'`,
  `costTier: 'mid'`).
- **No breaking changes to `ProviderConfig`** — new field is optional, additive.
- **No new dependency on `@xenova/transformers` or similar** in this phase
  (that's Phase F).

## Success Criteria

1. Given a prompt with ` ```code blocks ` and multi-step language ("first do X,
   then Y"), router picks the highest-`reasoning` provider.
2. Given a short greeting ("hi", "thanks"), router picks the cheapest/fastest
   provider.
3. With `capabilities` absent from `providers.yaml`, router still functions
   (uses defaults).
4. `vesta-intent-router` has ≥10 unit tests covering intent classification and
   provider scoring, ≥1 integration test for the `auto:vesta` alias.
5. `/model` dialog in dynamic mode shows `Auto (Vesta)` entry with description,
   and selecting it persists as `auto:vesta` in settings.
6. Existing `auto` behavior is byte-for-byte unchanged when `auto:vesta` is not
   selected.

## Risks

- **Heuristic misclassification** (a long prompt that looks like "reasoning" is
  actually a copy-paste).
  - _Mitigation_: keep thresholds conservative; always provide `userDefault`
    fallback when confidence < 0.6.
- **Capability metadata drift** (user updates `providers.yaml` but forgets
  capabilities).
  - _Mitigation_: defaults are sensible; warn (not error) at load time if a
    provider has no capabilities declared.
- **Routing flapping** if `auto:vesta` is re-evaluated mid-turn.
  - _Mitigation_: cache decision on `Config` instance keyed by turn id; reset
    only when user issues a new prompt.
- **Provider scoring becomes a popularity contest** (DeepSeek always wins
  because reasoning=high).
  - _Mitigation_: cost tier acts as a tiebreaker; expose scoring weights as
    constants for future tuning.

## Ambiguities

### Blocking

- (none — heuristic + capability scoring is a well-defined Phase A deliverable)

### Non-Blocking

- Whether to expose `vestaRouter` config (e.g. user can disable heuristic, force
  LLM classifier) — assumed NO for this phase, can be added later via
  `settings.experimental.vestaRouter` flag.
- Whether to log routing decisions to telemetry — assumed YES (debug logger), no
  user-visible telemetry by default.

## Assumptions

- The user is willing to declare `capabilities` in `providers.yaml` for best
  routing. We provide defaults so it's not blocking.
- The existing `ProviderRegistry` singleton lifecycle is fine — router queries
  it on each call (cheap) rather than caching.
- One turn = one user prompt + N tool calls. Cache lives for that scope.

## Spec Seeds

These are candidate requirements for the spec phase. Not binding. Derived from
Desired Outcome, Constraints, Risks, and Success Criteria.

- The system SHALL provide a `VestaRouter` module that classifies user intent
  via local heuristic and picks the highest-scoring provider from
  `ProviderRegistry`.
- The system SHALL allow operators to declare
  `capabilities: { reasoning, speed, costTier, contextWindow, supportsTools }`
  per provider in `providers.yaml`.
- The system SHALL resolve the alias `auto:vesta` to a concrete `provider/model`
  id via `VestaRouter.pickModelForIntent(...)` before invoking the LLM.
- The system SHALL cache the routing decision for the duration of one turn (one
  user prompt).
- The system SHALL fall back to the user's declared default provider when
  heuristic confidence is below threshold.
- The system SHALL NOT make network calls during routing.
- The system SHALL display `Auto (Vesta)` as the first option in the
  `ModelDialog` dynamic main view when `experimental.dynamicModelConfiguration`
  is enabled.
- The system SHALL preserve legacy `auto` behavior unchanged.

## Intent Approval

Status: DRAFT

Approved by: Date:
