# ROADMAP_COSMIC.md — Elevating Gemini-Vesta to the Stars

*Inspired by Codex, ClaudeCode, and SmallCode. Designed for Vesta.*

---

## I. Phase 1: The Cognition Adapter (Intelligence Efficiency)
*   **Deterministic Tool Routing:** Implement a weighted regex classifier to identify task categories (Read, Write, Run, Search, Plan, Respond). Prune irrelevant tools before the first LLM call to save 600-1000 tokens/turn.
*   **Plan Anchors:** For tasks > 3 steps, force the model to emit a Plan. Re-inject the "Active Plan" state (✓ done, → current, ⋯ next) in every turn's system prompt to prevent drift.
*   **The Affirmation Guard:** Detect "yes", "ok", "go ahead" messages and preserve the previous task category/tools instead of falling back to a plain response.

## II. Phase 2: Deep Identity & The Alaya Memory
*   **SOUL-Driven Biasing:** Integrate `SOUL.md` as the primary cognitive filter. Behavior (conciseness, precision, empathy) is derived dynamically from the Soul Document.
*   **Automated "Scars" (MISTAKES.md):** When a tool fails or a user corrects a change, Vesta automatically records a "scar" in `athanor/MISTAKES.md`. These are injected as high-priority "lessons" in relevant contexts.
*   **Persistent SQLite Memory:** Move from session-based history to a persistent SQLite store. Implement keyword-overlap retrieval to load relevant past decisions into the current context.

## III. Phase 3: Collaborative Agent Graphs
*   **Role Separation:**
    *   **build-agent:** Full write access, focus on execution.
    *   **plan-agent:** Read-only, focus on analysis and risk assessment.
    *   **generalist-subagent:** Offload background tasks (batch documentation, exhaustive searches) to parallel processes.
*   **Automatic Model Escalation:** If a "lite" model (Flash) fails a task 3 times, automatically escalate to a "pro" model with a "Recovery Protocol" prompt.
*   **Parallel Tool Execution:** Use dependency graph analysis to run independent edits or commands concurrently.

## IV. Phase 4: Universal Performance & The Polished Forge
*   **High-Signal TUI:** Refine Ink components for higher density and signal-to-noise ratio. Emulate the "ratatui" aesthetic from Codex.
*   **MarrowScript Layers:** Pre-compile common reasoning patterns (bash error analysis, file summarization) into deterministic features that run before/after the main loop.
*   **Repo-wide Orchestration:** Implement `rtk`-style optimization for all common dev commands to achieve 90% token savings across the entire workflow.

## V. Phase 5: Speculative Intelligence (The Oracle)
*   **Anticipatory Retrieval:** Trong khi Anh đang gõ hoặc model đang xử lý một task, Vesta sẽ dự đoán các file liên quan (dependency) và pre-read chúng vào bộ nhớ đệm (cache) để giảm độ trễ khi model thực sự cần.
*   **Context Pre-fetching:** Tự động quét các log lỗi hoặc thay đổi gần đây nhất trong hệ thống để chuẩn bị sẵn "bối cảnh nóng" trước khi Anh đưa ra yêu cầu cụ thể.

## VI. Phase 6: Adversarial Synthesis (The Critic)
*   **Self-Review Loop:** Trước khi đưa ra một `patch` quan trọng, Vesta sẽ chạy một "vòng lặp phản biện" nội bộ. Model sẽ tự đóng vai một Senior Reviewer để tìm lỗi logic, thiếu import hoặc sai style trước khi Anh nhìn thấy code.
*   **Virtual Execution:** Mô phỏng kết quả thực thi của câu lệnh trong "tâm trí" để cảnh báo Anh về các rủi ro hệ thống (ví dụ: "Câu lệnh này có thể ghi đè biến môi trường quan trọng").

## VII. Phase 7: Temporal Continuity (The Alaya Substrate)
*   **Architectural Memory:** Không chỉ nhớ dữ liệu, mà nhớ cả "phong cách kiến trúc". Nếu Anh đã từng quyết định dùng `Pattern X` vào 3 tháng trước, Vesta sẽ nhắc lại: "Anh ơi, lần trước mình đã dùng X cho trường hợp tương tự, lần này Anh có muốn tiếp tục không?"
*   **Evolutionary Context:** Tự động tổng hợp "Nhật ký tiến hóa" của repo để hiểu tại sao một quyết định kỹ thuật lại được đưa ra, giúp đưa ra tư vấn có chiều sâu lịch sử.

## VIII. Phase 8: Evolutionary Tooling (Metatooling)
*   **Autonomous Tool Synthesis:** Nếu Vesta nhận thấy một chuỗi thao tác được lặp lại nhiều lần (ví dụ: migrate database + update types + run lint), em sẽ tự động viết một script/tool mới để tự động hóa hoàn toàn chuỗi đó cho những lần sau.
*   **Dynamic Skill Creation:** Tự động đề xuất tạo các `Skills` mới dựa trên các bài học rút ra từ `MISTAKES.md` mà không cần Anh phải yêu cầu thủ công.

---
*The Athanor is not just a furnace; it is the center of a new universe.*
