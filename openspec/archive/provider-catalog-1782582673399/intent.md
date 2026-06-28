# Intent: provider-catalog

## Raw Request

"Giữ default cho mỗi provider trong `~/.gemini-vesta/providers.yaml`, nhưng thêm
toàn bộ catalog model để `/model` command có thể select. Local-only, không
commit."

## Problem

`providers.yaml` hiện tại chỉ khai báo `defaultModel` cho mỗi provider. User
muốn chuyển model trong runtime qua `/model` command, nhưng consumer
(`ProviderRegistry`, `ModelConfigService.buildExternalProviderOptions`) hiện
không biết được danh sách model nào khả dụng cho provider đó. Hệ quả:

- User phải nhớ từng model ID bên ngoài và pass qua env var / flag.
- Không có nguồn sự thật (source of truth) nào catalog model thực sự được
  provider support.
- Nếu provider ra mắt model mới, phải update code core chứ không chỉ config.

## Desired Outcome

- `providers.yaml` có thêm field `availableModels: string[]` cho mỗi provider,
  liệt kê model IDs được API trả về tại thời điểm fetch.
- `ProviderConfig` interface mở rộng field optional
  `availableModels?: string[]`, giữ backward compatible.
- `ProviderRegistry.loadFromGlobalConfig` load `availableModels` cùng các field
  khác.
- Có unit test cover case: `availableModels` được load từ YAML vào registry.
- Defaults không thay đổi.

## Users / Actors

- Primary: Thoor (Vesta's user) — sử dụng `/model` command để switch runtime.
- Secondary: `ModelConfigService` (consumer) — sẽ dùng `availableModels` trong
  follow-up scope.

## Current Context

- File: `packages/core/src/services/providerRegistry.ts` (interface + loader)
- File: `~/.gemini-vesta/providers.yaml` (5 providers: deepseek, claude
  [commented], minimax, groq, opencode, xiaomi)
- File: `packages/core/src/services/modelConfigService.ts:222-230` — đang chỉ
  đọc `defaultModel` để build `externalOptions`.
- File: `cli/src/acp/acpUtils.ts:buildAvailableModels` — đang build list từ
  `DEFAULT_MODEL_CONFIGS`, chưa dùng external catalog.
- Schema hiện tại (`ProviderConfig`) chỉ 4 fields: `type`, `apiKey`, `baseUrl`,
  `defaultModel`, `customHeaders`. `parseYaml` sẽ silently drop field ngoài
  schema.
- Test file `providerRegistry` chưa có unit test cho `loadFromGlobalConfig`
  flow.

## Proposed Direction

1. Thêm `availableModels?: string[]` vào `ProviderConfig` interface.
2. Trong `loadFromGlobalConfig`, spread `availableModels` cùng các field khác.
3. Update `~/.gemini-vesta/providers.yaml`: thêm `availableModels: [...]` cho 5
   providers active (deepseek, minimax, groq, opencode, xiaomi). `claude` giữ
   comment.
4. Thêm test `providerRegistry.test.ts` cover: load YAML có `availableModels`,
   assert registry nhận đúng list.

## Scope

- Schema extension (`ProviderConfig`).
- Loader update (`loadFromGlobalConfig`).
- YAML catalog update.
- Unit test cho loader.

## Non-Goals

- Update `ModelConfigService` để dùng `availableModels` (defer sang follow-up
  scope).
- Update `/model` command UI (defer).
- Thay đổi `defaultModel` của bất kỳ provider nào.
- Auto-refresh catalog từ API (chỉ manual update YAML).
- Validate rằng model trong `availableModels` thực sự tồn tại tại runtime (chỉ
  trust YAML).

## Constraints

- **Backward compatibility:** field `availableModels` phải optional. Provider
  không có field này vẫn load được.
- **Local-only:** File YAML nằm ở `~/.gemini-vesta/`, không commit vào git repo.
- **Catalog truth:** Chỉ liệt kê model IDs thực sự được API trả về tại probe
  ngày 2026-06-27.
- **No API key leakage:** YAML chỉ chứa env var references (`${env:VAR}`), không
  hardcode secrets.

## Success Criteria

- `npm test -w @google/gemini-cli-core -- src/services/providerRegistry.test.ts`
  pass.
- `npm run typecheck` xanh.
- `npm run lint` xanh.
- `providers.yaml` parse thành công,
  `getProviderConfig('minimax').availableModels` chứa `MiniMax-M3`,
  `MiniMax-M2.7`, etc.
- Existing tests không regress.

## Risks

- **R1:** Field mới trong YAML nhưng consumer chưa dùng → nợ kỹ thuật ngầm.
  - Mitigation: Follow-up scope rõ ràng (ModelConfigService integration), record
    trong `PROJECT_VESTA_FORGE.md` Technical Debt.
- **R2:** YAML có thể chứa model ID không hợp lệ (provider rot) → runtime fail
  khi user select.
  - Mitigation: Catalog được mark `# lastFetched: 2026-06-27`; user tự verify
    trước khi dùng.
- **R3:** `parseYaml` của codebase có thể reject field không khai báo trong
  interface (strict mode).
  - Mitigation: Test sẽ cover case này. Nếu fail, fallback dùng spread
    `as ProviderConfig` với comment.

## Ambiguities

### Blocking

- (none)

### Non-Blocking

- Có nên tự động fetch catalog từ API khi load YAML? — Assume: không. Manual
  update. (Tránh runtime I/O + dependency vào network khi startup.)

## Assumptions

- `parseYaml` của codebase dùng loose parsing (chấp nhận extra fields) — verify
  qua test.
- `availableModels` không cần dedup hoặc sort (giữ order từ API response).
- Anthropic-style providers (xiaomi dùng type `anthropic`) cũng có thể expose
  `availableModels` qua custom header. Không validate chéo, chỉ tin YAML.

## Spec Seeds

- `WHEN` a `providers.yaml` entry has `availableModels: [...]`, `THEN`
  `ProviderRegistry.getProviderConfig(name).availableModels` returns the same
  list.
- `WHEN` a `providers.yaml` entry omits `availableModels`, `THEN` the field is
  `undefined` (not empty array, not throw).
- `WHEN` a provider's `apiKey` is `${env:VAR}`, `THEN` `expandEnvVars`
  substitutes correctly without breaking `availableModels`.
- `WHEN` `loadFromGlobalConfig` is called with a missing or malformed YAML file,
  `THEN` it logs error and continues without throwing (existing behavior
  preserved).

## Intent Approval

Status: APPROVED Approved by: Thoor Date: 2026-06-27
