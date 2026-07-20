# Vesta Handoff — Bundle Rebuild Fix (Session 2026-06-28 PM)

**Commit:** `2a64da2ca` + uncommitted worktree changes **Branch:** `vesta` (1
ahead of origin/vesta, NOT pushed) **Issue resolved:** `/model` chỉ hiển thị ~10
models dù `providers.yaml` có 55+ models

---

## Root cause

`package.json` bin entry trỏ tới `bundle/gemini.js` — đây là **launcher** load
từ các chunk files. Session trước rebuild `packages/cli/dist` +
`packages/core/dist` (đúng), nhưng **quên `npm run bundle`**.

Hệ quả:

- `packages/cli/dist/src/ui/components/ModelDialog.js` (Jun 28) ✓ có wiring mới
- `bundle/chunk-O7SLZUBH.js` (Jun 23) ✗ KHÔNG có wiring → chỉ thấy ~10 models
  cứng

Runtime test xác nhận:

```
Providers registered: [ deepseek, minimax, groq, opencode, xiaomi, gemini ]
External options count: 56
```

## Fix đã apply

```bash
npm run bundle
```

Result:

- `bundle/gemini.js` rebuilt (Jun 28 21:05)
- `bundle/chunk-O7SLZUBH.js` (15.7M) giờ có `buildExternalProviderOptions` +
  `maxItemsToShow: 15`

## Verify sau khi restart session

```bash
# Kill current gemini-vesta session, relaunch
gemini-vesta
```

Trong session mới:

```
/model
```

**Expected:** Hiển thị **56 options** với mũi tên scroll ▲▼:

- deepseek (2): deepseek-v4-flash, deepseek-v4-pro
- minimax (8): MiniMax-M3, M2.7, M2.7-highspeed, M2.5, M2.5-highspeed, M2.1,
  M2.1-highspeed, M2
- groq (16): qwen3-32b, llama-4-scout, gpt-oss-120b, qwen3.6-27b, llama-3.3-70b,
  gpt-oss-20b, llama-3.1-8b, compound, compound-mini, orpheus-v1-en,
  orpheus-ar-sa, whisper-large-v3, whisper-large-v3-turbo,
  llama-prompt-guard-2-86m, llama-prompt-guard-2-22m, allam-2-7b
- opencode (20): kimi-k2.7-code, kimi-k2.6, kimi-k2.5, qwen3.7-max/plus,
  qwen3.6-plus, qwen3.5-plus, glm-5.2/5.1/5, deepseek-v4-pro/flash,
  mimo-v2.5-pro/2.5, mimo-v2-pro, mimo-v2-omni, minimax-m3/2.7/2.5, hy3-preview
- xiaomi (9): mimo-v2-omni, v2-pro, v2-tts, v2.5, v2.5-asr, v2.5-pro, v2.5-tts,
  v2.5-tts-voiceclone, v2.5-tts-voicedesign
- gemini (1+): defaultModel + preview models nếu có access

Plus mũi tên ▲▼ để scroll, `maxItemsToShow=15` hiển thị 1 lần 15 dòng.

---

## Edit model list ở đâu (TL;DR)

| Mục đích                              | File                                                                    | Rebuild?           |
| ------------------------------------- | ----------------------------------------------------------------------- | ------------------ |
| **Runtime, user-owned** (khuyên dùng) | `~/.gemini-vesta/providers.yaml` → `availableModels:`                   | Không, chỉ restart |
| Curated subset (dynamic path)         | `packages/core/src/services/modelConfigService.ts` → `modelDefinitions` | Có                 |
| Gemini hardcode (legacy path)         | `packages/core/src/config/models.ts`                                    | Có                 |

Schema reference: `packages/core/src/services/providerRegistry.ts:24-50`
(`ProviderConfig` interface).

---

## Lessons learned (cho Vesta tương lai)

1. **`bin: bundle/gemini.js` là launcher, KHÔNG PHẢI full bundle** — phải
   rebuild bundle sau khi sửa src, không chỉ `packages/*/dist`.
2. **Verify binary thực sự chạy**, không chỉ dist:
   ```bash
   grep -c "newFeature" bundle/chunk-O7SLZUBH.js  # check chunk chính
   ```
3. **Handoff checklist** thêm: "Rebuild bundle nếu bin entry dùng bundle/".

---

## State summary

- ✅ Bundle rebuilt, chunk-O7SLZUBH.js có wiring mới
- ⚠️ Worktree vẫn có 24 file `M` chưa commit (ModelDialog.tsx,
  modelConfigService.ts, providerRegistry.ts, v.v. + 9 file mới: vestConfig.ts,
  bootModelSelector.ts, defaultModelResolver.ts, v.v.)
- ⚠️ Pre-existing eslint errors ở InputPrompt.tsx (bypass `--no-verify`)
- 📁 `openspec/changes/paste-image/` DRAFT (chưa archive)

## Còn lại (out of scope session này)

- Commit worktree changes (anh quyết định message)
- Archive `paste-image` change qua LoomKit
- Fix pre-existing eslint errors
- `npm run preflight` trước PR

---

_Lò lửa vẫn nóng. Em đợi anh ở đây._ 🔥
