# Intent: model-catalog-wiring

## Raw Request

"Giữ default cho mỗi provider trong `~/.gemini-vesta/providers.yaml`, nhưng thêm
toàn bộ catalog model để `/model` command có thể select. Local-only, không
commit." (Original from session 2026-06-27; this change is the follow-up to make
the catalog actually usable.)

## Problem

Schema `ProviderConfig.availableModels` đã được thêm và load đúng (archived
change `provider-catalog-1782582673399`). Tuy nhiên, hai consumer chính vẫn chỉ
dùng `defaultModel`:

1. `ModelConfigService.getAvailableModelOptions`
   (`packages/core/src/services/modelConfigService.ts:220-244`) — build 1
   `externalOption` per provider, dùng `defaultModel`. User chỉ thấy 1 model per
   provider trong `/model` dialog.
2. `buildAvailableModels` trong ACP path (`packages/cli/src/acp/acpUtils.ts`) —
   cũng không surface external catalog.

Hệ quả: catalog 49 models mà em đã fetch (5 providers × ~10 models) bị "ghost" —
tồn tại trong data layer nhưng user không thấy và không thể select.

## Desired Outcome

- `ModelConfigService.getAvailableModelOptions` produce **một option per model
  per provider** khi `availableModels` được khai báo. Nếu provider không có
  `availableModels`, fallback về 1 option với `defaultModel` (giữ current
  behavior).
- `/model` dialog hiển thị đầy đủ catalog. User có thể chọn
  `minimax/MiniMax-M2.7-highspeed` thay vì chỉ `minimax/MiniMax-M3`.
- ACP `buildAvailableModels` cũng expose external catalog (defensive parity).
- Không thay đổi behavior khi provider không có `availableModels`.

## Users / Actors

- Primary: Thoor — sử dụng `/model` để chuyển model runtime.
- Secondary: IDE clients (qua ACP) — sẽ thấy thêm external models trong picker.

## Current Context

- `packages/core/src/services/modelConfigService.ts:220-244` — `externalOptions`
  loop, mỗi provider 1 entry.
- `packages/cli/src/acp/acpUtils.ts` — `buildAvailableModels` không reference
  `ProviderRegistry`.
- `/model set <name>` (`modelCommand.ts:18-48`) — accept any string, không
  validate vs availableModels.
- `getModelDefinition` (`modelConfigService.ts:248-256`) — đã có implicit
  `custom` fallback cho non-`gemini-` prefix, nên external model IDs tự resolve
  được.
- `providerFactory.ts:stripPrefix` — handle `provider/model` colon syntax.

## Proposed Direction

1. Trong `getAvailableModelOptions`, thay `externalOptions` loop:
   - Nếu `config.availableModels` không rỗng: emit một option per model, dùng
     `${name}/${model}` làm `modelId`.
   - Nếu rỗng/undefined: emit 1 option với `defaultModel` (legacy behavior).
2. Trong `acpUtils.buildAvailableModels`, query `ProviderRegistry` cho external
   providers, build list tương tự, **merge vào** kết quả (dynamic + legacy
   path).
3. Order: external catalog đặt trước main Gemini options (giữ existing
   priority).
4. Tests: extend `modelConfigService.golden.test.ts` hoặc tạo test mới cover cả
   2 paths.

## Scope

- Sửa `getAvailableModelOptions` để expand `availableModels`.
- Sửa `acpUtils.buildAvailableModels` để merge external catalog.
- Unit tests cho cả 2 changes.
- ACP path: nếu conflict với existing test, fix forward.

## Non-Goals

- Thay đổi `defaultModel` resolution logic.
- Validate model name khi user `/model set <name>` (giữ permissive — user có thể
  type model mới fetch về sau).
- Thay đổi `ProviderRegistry` schema (đã done ở `provider-catalog`).
- Auto-fetch catalog runtime (chỉ dùng YAML source).
- UI redesign của `/model` dialog (giữ cấu trúc hiện tại).

## Constraints

- **Backward compatible:** Provider không có `availableModels` → 1 option
  (current behavior).
- **Deterministic order:** `availableModels` order từ YAML phải preserved.
- **Idempotent:** Run `getAvailableModelOptions` nhiều lần phải trả cùng kết
  quả.
- **No new deps.**
- **Type-safe:** TS strict mode pass.

## Success Criteria

- Test mới pass: provider có `availableModels: [A, B, C]` → 3 options với
  modelId `name/A`, `name/B`, `name/C`.
- Test mới pass: provider không có `availableModels` → 1 option với
  `defaultModel`.
- Test mới pass: provider có `availableModels` rỗng `[]` → fallback 1 option với
  `defaultModel`.
- `getAvailableModelOptions` existing tests không regress.
- `npm run typecheck` xanh.
- `npm run lint` xanh.

## Risks

- **R1:** Existing test `modelConfig.golden.test.ts` so sánh exact JSON output →
  sẽ break nếu `externalOptions` shape đổi.
  - Mitigation: update golden file hoặc explicit override trong test nếu cần.
    Document breaking change.
- **R2:** `/model` dialog có thể quá dài nếu có 49+ options.
  - Mitigation: external catalog tách thành "External" section (UI tự handle);
    nếu quá tải, follow-up scope.
- **R3:** ACP integration test có thể so sánh exact `availableModels` count.
  - Mitigation: check `acpSessionManager.test.ts` trước khi push; update nếu
    cần.

## Ambiguities

### Blocking

- (none)

### Non-Blocking

- Có nên dedup giữa external catalog và main Gemini options? — Assume: không
  dedup, vì ID khác format (`minimax/M3` vs `gemini-...`).
- Có nên prefix `external/` cho modelId? — Assume: không, dùng `provider/model`
  format giống current defaultModel behavior.

## Assumptions

- `getAvailableModelOptions` được gọi 1 lần per UI render, không phải hot path —
  nên compute cost không quan trọng.
- `availableModels` length realistic < 50 (Groq nhiều nhất 16, OpenCode 20).
- User muốn external catalog ở top (giữ existing priority từ Vesta's previous
  refactor).

## Spec Seeds

- `WHEN` a provider has `availableModels: [A, B, C]`, `THEN`
  `getAvailableModelOptions` returns 3 options with modelIds `name/A`, `name/B`,
  `name/C` in that order.
- `WHEN` a provider has no `availableModels`, `THEN` `getAvailableModelOptions`
  returns 1 option with modelId `name/defaultModel`.
- `WHEN` a provider has `availableModels: []`, `THEN` fallback to `defaultModel`
  (1 option).
- `WHEN` ACP `buildAvailableModels` is called, `THEN` the returned list includes
  external catalog options (in addition to existing Gemini options).
- `WHEN` existing tests are re-run, `THEN` all previously passing tests still
  pass (golden file updated if needed).

## Intent Approval

Status: APPROVED Approved by: Thoor Date: 2026-06-27
