## Why

Vesta CLI hiện hard-code Gemini làm default provider, biến `GEMINI_API_KEY`
thành single point of failure. Trong khi đó `~/.gemini-vesta/providers.yaml` đã
có 49 models từ 5 providers (deepseek, minimax, groq, opencode, xiaomi) — đây
mới là sovereign source of truth mà Vesta phải đọc. Change này gỡ bỏ provider
lock-in, đưa `~/.gemini-vesta/` lên làm boot authority, biến Gemini thành opt-in
provider thay vì forced default.

## What Changes

- **New**: `~/.gemini-vesta/config.yaml` — user-owned config với
  `defaultProvider`, `defaultModel`, optional `geminiApiKey`.
- **New**: `packages/core/src/config/vestaConfig.ts` — loader + validator cho
  `~/.gemini-vesta/config.yaml` (YAML).
- **New**: `packages/core/src/services/defaultModelResolver.ts` — resolve
  default model qua 4-tier priority chain.
- **New**: `packages/core/src/services/defaultModelResolver.test.ts` — unit
  tests ≥ 4 scenarios.
- **Modified**: `packages/core/src/services/providerRegistry.ts` — Gemini
  registration thành opt-in (chỉ khi `GEMINI_API_KEY` có).
- **Modified**: `packages/cli/src/gemini.tsx` (hoặc entry point tương đương) —
  dùng resolver trước khi init Config.
- **New**: CLI flag `--provider <name>` — force chọn provider override mọi
  config.
- **New**: Env `VESTA_DEFAULT_MODEL` — highest-priority override.
- **New**: Integration test `integration-tests/sovereign-boot.test.ts` — E2E
  boot không có `GEMINI_API_KEY`.
- **New**: Permission check cho `config.yaml` — warn nếu 0644+ chứa API key.

## Capabilities

### New Capabilities

- `sovereign-boot`: Default model resolution chain + opt-in Gemini
  registration + user-owned config.yaml + CLI flag override. Toàn bộ behavior
  được định nghĩa trong `specs/sovereign-boot/spec.md`.

### Modified Capabilities

- `provider-registry`: Existing capability về provider registration thay đổi —
  Gemini no longer auto-registered. Backward compat: nếu `GEMINI_API_KEY` có,
  register như cũ.
- `model-config`: Default model resolution chuyển từ hardcoded sang resolver
  chain. `/model` dialog behavior giữ nguyên.

## Impact

**Affected code:**

- `packages/core/src/services/providerRegistry.ts` — refactor registration
  logic.
- `packages/core/src/index.ts` — export new `defaultModelResolver`.
- `packages/cli/src/gemini.tsx` (hoặc `packages/cli/src/index.ts`) — entry point
  integration.
- `packages/cli/src/commands/` — add `--provider` flag parsing.

**New files:**

- `~/.gemini-vesta/config.yaml` (runtime, user-owned).
- `packages/core/src/config/vestaConfig.ts`.
- `packages/core/src/services/defaultModelResolver.ts`.
- `packages/core/src/services/defaultModelResolver.test.ts`.
- `integration-tests/sovereign-boot.test.ts`.

**APIs:**

- Public export mới: `resolveDefaultModel()`, `loadVestaConfig()` từ
  `@google/gemini-cli-core`.
- Behavior change: khi không có `GEMINI_API_KEY`, CLI trước đây fail-fast, giờ
  fallback tới catalog.

**Dependencies:**

- Không thêm npm dependency — dùng sẵn `yaml` lib (đã có từ `providers.yaml`
  loader).
- Không modify Antigravity companion routing.

**Compatibility:**

- **Breaking nếu user set `GEMINI_API_KEY` và expect Gemini là default**:
  behavior giữ nguyên (backward compat).
- **Breaking nếu user rely on hard-fail khi missing `GEMINI_API_KEY`**: giờ CLI
  boot được từ catalog. Đây là intentional behavior change theo intent.
