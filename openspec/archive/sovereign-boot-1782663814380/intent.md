# Intent: sovereign-boot

## Raw Request

> Em phải boot không phụ thuộc Gemini, chỉ đọc từ `~/.gemini-vesta`, không dùng
> GEMINI_API-KEY (chỉ dùng để cung cấp thêm Model thôi)

## Problem

Vesta (forked Gemini CLI tại `gemini-vesta/`) hiện tại hard-code
`gemini-2.5-pro` (hoặc một model Gemini khác) làm default model. Điều này tạo ra
2 vấn đề:

1. **Provider lock-in thực tế**: Nếu `GEMINI_API_KEY` không có trong env, CLI
   không boot được — dù catalog đã có 49 external models ở 5 providers
   (deepseek, minimax, groq, opencode, xiaomi) trong
   `~/.gemini-vesta/providers.yaml`.

2. **Athanor sovereignty bị vi phạm**: Identity, defaults, provider selection
   của Vesta phải nằm trong `~/.gemini-vesta/` (lãnh thổ độc lập của em), không
   bị Google API làm single point of failure.

## Desired Outcome

Sau khi hoàn tất change này:

- ✅ `gemini-vesta` CLI boot được **khi không có** `GEMINI_API_KEY` trong env,
  bằng cách dùng first available model từ `~/.gemini-vesta/providers.yaml`.
- ✅ `GEMINI_API_KEY` vẫn optional: nếu có, thêm provider "gemini" vào catalog
  (opt-in, không default).
- ✅ Default model resolution: ưu tiên `~/.gemini-vesta/config.yaml` →
  `providers.yaml` → first provider's first model → fallback error rõ ràng.
- ✅ `~/.gemini-vesta/` trở thành source of truth cho boot, không phải Google
  servers.

## Users / Actors

- **Primary**: Thoor (anh) — operator của Vesta, owner của `~/.gemini-vesta/`.
- **Secondary**: Vesta runtime — CLI process boot với model bất kỳ.
- **External**: Providers trong catalog (deepseek, minimax, groq, opencode,
  xiaomi, [optional] gemini).

## Current Context

- Source: `/Users/thoor/work/gemini-vesta/` (monorepo TypeScript, Node 20+,
  React/Ink CLI).
- Provider catalog: `~/.gemini-vesta/providers.yaml` — 49 models, 5 active
  providers, `lastFetched: 2026-06-27`.
- Wiring đã xong từ 2026-06-27 (archived `model-catalog-wiring-1782585615141`):
  - `ModelConfigService.getAvailableModelOptions` expand `availableModels` qua
    `buildExternalProviderOptions()`.
  - `ModelDialog.tsx` legacy path đã inject external options.
  - `ProviderRegistry` + `buildExternalProviderOptions` exported từ
    `@google/gemini-cli-core`.
- **Chưa xong**: default model resolution vẫn dùng hardcoded Gemini.
- Antigravity companion hook ở `~/.gemini-vesta/GEMINI.md` vẫn dùng
  `.aura`/`.vesta` directory routing — không thuộc scope change này (intact).

## Proposed Direction

1. **Config layer**: Tạo `~/.gemini-vesta/config.yaml` schema với
   `defaultProvider`, `defaultModel`, optional `geminiApiKey` (nếu user muốn
   opt-in).
2. **Boot resolver**: Một module mới
   `packages/core/src/services/defaultModelResolver.ts` resolve default model
   theo thứ tự:
   - Env `VESTA_DEFAULT_MODEL` (override)
   - `~/.gemini-vesta/config.yaml.defaultModel`
   - First available provider's first model từ `providers.yaml`
   - Fallback: throw với hướng dẫn "set GEMINI_API_KEY hoặc configure provider".
3. **GEMINI_API_KEY demotion**: Chỉ load provider "gemini" vào registry khi env
   var tồn tại. Không bao giờ hard-fail nếu thiếu.
4. **ProviderRegistry enhancement**: Hiện registry đọc providers từ 1 hardcoded
   list. Refactor để auto-register Gemini chỉ khi key có.
5. **CLI startup integration**: Sửa entry point của `gemini-vesta` CLI để dùng
   resolver trước khi init chat session.

## Scope

- Tạo `~/.gemini-vesta/config.yaml` schema + loader.
- Mới: `defaultModelResolver.ts` trong `@google/gemini-cli-core`.
- Modify: `providerRegistry.ts` để Gemini là opt-in.
- Modify: CLI entry point (`packages/cli/src/gemini.tsx` hoặc tương đương) để
  dùng resolver.
- Tests: unit tests cho resolver + integration test "boot without
  GEMINI_API_KEY".
- Documentation: cập nhật `docs/cli/configuration.md` (nếu có).

## Non-Goals

- ❌ Không thay đổi Antigravity companion routing (Aura/Vesta).
- ❌ Không tự host LLM model — em vẫn dùng inference từ external providers qua
  API.
- ❌ Không viết lại toàn bộ provider catalog — chỉ thay đổi resolution +
  registration logic.
- ❌ Không touch `gitService.test.ts` pre-existing failures (không liên quan).
- ❌ Không auto-migrate data cũ — fresh install pattern.

## Constraints

- **Backward compat**: Nếu user đang dùng `GEMINI_API_KEY`, behavior phải giống
  hệt như cũ (default = Gemini).
- **No regression**: Existing tests về `ProviderRegistry`,
  `buildExternalProviderOptions`, `ModelConfigService`, `ModelDialog` phải pass.
- **Empirical verification**: Phase verify phải boot CLI thật, không chỉ
  typecheck/lint.
- **Sovereignty**: Tất cả changes phải ở trong `gemini-vesta/` workspace +
  `~/.gemini-vesta/` config — không tạo file mới ngoài 2 nơi này.

## Success Criteria

- [ ] `unset GEMINI_API_KEY && gemini-vesta` → boot thành công, dùng model từ
      `providers.yaml`.
- [ ] `GEMINI_API_KEY=xxx gemini-vesta` → boot thành công, default = Gemini
      (backward compat).
- [ ] `VESTA_DEFAULT_MODEL=groq/llama-3 gemini-vesta` → boot với Groq Llama 3.
- [ ] Unit tests: resolver ≥ 4 scenarios (env override, config, fallback,
      missing all).
- [ ] Integration test: 1 E2E boot scenario không có Gemini key.
- [ ] Tất cả existing tests pass (ngoại trừ `gitService.test.ts` pre-existing).
- [ ] `npm run preflight` green.

## Risks

- **Risk**: Boot fail nếu `providers.yaml` cũng trống.
  - **Mitigation**: Fallback error message rõ ràng: "No providers configured.
    Run `loomkit init-providers` or set GEMINI_API_KEY."
- **Risk**: User confusion khi default model thay đổi đột ngột.
  - **Mitigation**: Log rõ ràng lúc boot: "Default model: groq/llama-3 (from
    providers.yaml)".
- **Risk**: Config file permissions issue trên macOS/Linux.
  - **Mitigation**: Đặt permission 0600 cho `config.yaml` nếu có API key, warn
    nếu 0644.
- **Risk**: Refactor `ProviderRegistry` breaks existing wiring.
  - **Mitigation**: TDD strict, giữ interface `getAvailableProviders()`
    unchanged.

## Ambiguities

### Blocking

- ❓ Anh muốn `~/.gemini-vesta/config.yaml` là **JSON hay YAML**? (YAML
  consistent với `providers.yaml` — em đề xuất YAML).
- ❓ Khi không có config + không có GEMINI_API_KEY, **fail-fast hay fallback
  sang provider random đầu tiên**? (Em đề xuất: fallback tới first provider — ít
  disruption nhất).

### Non-Blocking

- Schema cho `config.yaml` exact fields — em sẽ design ở phase Design.
- Có cần CLI flag `--provider` để force chọn provider không? — em đề xuất có,
  defer to spec.

## Assumptions

- **Assumption**: `providers.yaml` format hiện tại (49 models, 5 providers) đã
  stable.
  - **Why acceptable**: Verified 2026-06-27, archived as
    `provider-catalog-1782582673399`.
- **Assumption**: `~/.gemini-vesta/` tồn tại và writable.
  - **Why acceptable**: Athanor đã ở đây, đây là assumption base cho mọi Vesta
    session.
- **Assumption**: Không có user nào khác ngoài anh dùng fork này.
  - **Why acceptable**: Đây là personal sovereign fork, không phải public
    release.

## Spec Seeds

- WHEN user runs `gemini-vesta` không có `GEMINI_API_KEY` AND `providers.yaml`
  có ≥1 provider, THEN CLI phải boot với first provider's first model.
- WHEN `~/.gemini-vesta/config.yaml.defaultModel` tồn tại, THEN CLI dùng nó làm
  default (override providers.yaml order).
- WHEN `VESTA_DEFAULT_MODEL` env có giá trị, THEN CLI dùng nó (highest
  priority).
- WHEN không có bất kỳ config nào, THEN CLI in error rõ ràng với 2 hướng dẫn
  recovery.
- WHEN `GEMINI_API_KEY` có giá trị, THEN provider "gemini" được register vào
  catalog (opt-in).
- WHEN `gemini-vesta` boot, THEN log in ra default model + source
  (env/config/catalog/fallback).
- WHEN `~/.gemini-vesta/config.yaml` chứa API key, THEN file permission phải là
  0600 (warn nếu không).

## Intent Approval

Status: DRAFT — chờ anh duyệt để chuyển sang Spec.
