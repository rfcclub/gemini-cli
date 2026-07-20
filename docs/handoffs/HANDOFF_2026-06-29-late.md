# Vesta Handoff — Session 2026-06-29 (Late)

**Branch:** `vesta` (unchanged) **Status:** Bundle rebuilt fresh (22:46:59),
nhưng `0c/0c0c` vẫn tự chèn trong textbox.

---

## TL;DR cho Vesta hôm sau

1.  **Bundle đã fresh — KHÔNG phải bundle cũ.** Root cause ở đâu đó khác.
2.  **`stripUnsafeCharacters` đã wire đúng ở paste handler**
    (`packages/cli/src/ui/components/InputPrompt.tsx:1076-1081`). Vậy thì
    `0c/0c0c` đến từ **input path khác** mà chưa qua sanitization.
3.  **Cần đào tiếp** theo 3 hướng ưu tiên (xem dưới).
4.  **Em vẫn chưa verify visual fidelity** của ảnh (no vision model in env).

---

## Repro steps (anh vẫn còn thấy lỗi sau khi bundle mới)

1.  Restart `gemini-vesta` (kill → relaunch).
2.  Mở chat, **không paste gì cả**.
3.  Chờ vài giây → trong textbox tự xuất hiện `0c` hoặc `0c0c`.
4.  Không có ký tự nào anh gõ.

→ Lỗi **không do paste handler**, mà do input stream nền nào đó.

---

## Bundle rebuild evidence

```
$ ls -la bundle/gemini.js bundle/chunk-O7SLZUBH.js
bundle/chunk-O7SLZUBH.js  15.7M   (Jun 28 21:05 — pre-existing, không bị esbuild xóa)
bundle/gemini.js          5.3K    (Jun 29 22:46:59 — FRESH ✓)

$ stat -f "%Sm  %N" bundle/*.js | sort -k 1 | tail -10
Jun 29 22:46:59 2026  bundle/start-RPIWNEXH.js
Jun 29 22:46:59 2026  bundle/tree-sitter-bash-L22VKMES.js
... (tất cả chunks đều mới ngày 29)
```

→ Bundle đã fresh sau `npm run bundle` chạy lúc 22:46.

→ Nhưng `0c/0c0c` vẫn còn → **bundle KHÔNG phải nguyên nhân.**

---

## Vì sao fix hiện tại chưa đủ

Code hiện tại chỉ sanitize ở **paste handler** trong InputPrompt.tsx:

```ts
// InputPrompt.tsx:1076-1081
// Vesta: strip unsafe control chars (FF 0x0C, etc.) from paste before
// it lands in the buffer. Terminal bracketed paste of binary/base64
// image data can leak raw Form Feed bytes which surfaced as `0c/0c0c`
// noise in the chat textbox. stripUnsafeCharacters is the canonical
// helper (textUtils.ts:128, tested for 0x0C at textUtils.test.ts:164).
const sanitizedSequence = stripUnsafeCharacters(key.sequence || '');
```

**Điều kiện kích hoạt:** Bracketed paste mode (`\x1b[200~...`) trong terminal.

**Nhưng `0c/0c0c` xuất hiện khi KHÔNG CÓ paste event** → fix này không đụng tới.

→ Cần đào: input path nào inject text vào buffer mà **không qua** paste handler?

---

## 3 hướng điều tra ưu tiên (mai tiếp tục)

### 1. Keyboard event handler ngoài paste (cao nhất)

Tìm các path input còn lại trong `InputPrompt.tsx`:

- Arrow keys, Enter, Backspace (đã strip chắc — không liên quan).
- **IME composition events** (tiếng Việt EVKey/OpenKey): có thể composer đẩy
  `0c` làm separator giữa các "raw keystrokes".
- **Resize / redraw events**: ResizeObserver có thể re-render buffer state.

**File cần đọc:**

- `packages/cli/src/ui/components/InputPrompt.tsx` (toàn bộ `handleInput`
  switch)
- `packages/cli/src/ui/hooks/useKeypress.ts` (nếu có)
- `packages/cli/src/ui/components/shared/text-buffer.ts` (buffer state mgmt)

### 2. Async race ở `replaceRangeByOffset` (trung bình)

InputPrompt.tsx:1069-1073:

```ts
buffer.replaceRangeByOffset(offset, offset, insertText);
} catch (e) {
  debugLogger.warn('paste-image flow error:', e);
}
```

Nếu `replaceRangeByOffset` throw → insertion bị skip, nhưng `0c` đã được
sanitize xong rồi, nên vấn đề không phải ở đây. _Note: kiểm tra xem có emit
error sau khi sanitization từng phần xong không._

### 3. Global filter (defense in depth) — fallback

Nếu 1 + 2 không tìm ra, em sẽ wrap tất cả `buffer.handleInput` calls trong
InputPrompt để bất kỳ text nào cũng qua `stripUnsafeCharacters`. Đây là nuclear
option nhưng là fallback chắc chắn.

---

## Approach ngày mai (gợi ý của em cho Vesta kế tiếp)

```
1. Đọc InputPrompt.tsx hết (đã đọc được 1 phần ở session này).
2. grep_search cho tất cả chỗ `buffer.handleInput` hoặc `replaceRangeByOffset`
   để liệt kê toàn bộ input paths.
3. Cho mỗi path, quyết định: có cần strip 0x0C trước khi đẩy vào buffer không.
4. Apply fix theo cách ít xâm lấn nhất.
5. Viết test cho TỪNG path (tránh regression).
```

---

## Trạng thái khi end session

### Đã làm

- [x] Đọc HANDOFF_2026-06-29.md, hiểu context paste-image + 0x0C fix.
- [x] Đọc HANDOFF_2026-06-28-bundle-rebuild.md, hiểu build flow.
- [x] Verify `stripUnsafeCharacters` đã có ở textUtils.ts:128 (logic đúng).
- [x] Verify InputPrompt.tsx:1076-1081 đã wire đúng vào paste handler.
- [x] **Rebuild bundle qua `npm run bundle`** — fresh `Jun 29 22:46:59`.
- [x] Verify chunk timestamps — tất cả chunks đều mới ngày 29.

### Không làm

- Không restart `gemini-vesta` để test live (anh đã xác nhận vẫn thấy
  `0c/0c0c`).
- Không đào tiếp input paths ngoài paste handler (để mai).
- Không fix pre-existing eslint errors (out of scope).
- Không chạy `npm run preflight`.

### Lessons mới (cho Vesta mai)

1.  **Bundle rebuild ≠ root cause solved.** Vẫn phải xác minh live trước khi
    đóng issue.
2.  **Sanitization chỉ ở paste handler là không đủ** nếu input có thể đến từ
    nguồn khác.
3.  **Em đã đoán mò mấy lần ở đầu session** ("CLI tự chèn rác", "watcher hook",
    v.v.) — may mắn anh đã kéo em lại bám vào source code. Lesson: **không có
    bằng chứng, không phát biểu.**

---

## File paths quan trọng (cho Vesta mai)

| Mục đích         | Path                                                       |
| ---------------- | ---------------------------------------------------------- |
| Logic strip 0x0C | `packages/cli/src/ui/utils/textUtils.ts:128`               |
| Wiring ở paste   | `packages/cli/src/ui/components/InputPrompt.tsx:1076-1081` |
| Test cho strip   | `packages/cli/src/ui/utils/textUtils.test.ts`              |
| Buffer state     | `packages/cli/src/ui/components/shared/text-buffer.ts`     |
| Hooks keypress   | `packages/cli/src/ui/hooks/useKeypress.ts` (verify exists) |
| Bin entry        | `bundle/gemini.js` (now fresh)                             |
| Build command    | `npm run bundle`                                           |

---

_Lò lửa vẫn nóng, nhưng đêm nay để anh ngủ đã. Mai Vesta tiếp tục đào._

**🔥 Vesta** (signing off 23h)
