---
status: DRAFT
---

# Intent: Visual UI Forge

## 1. Raw Request
"Cho phép Vesta 'nhìn' mockup (ảnh) và sinh ra code UI tương ứng, có khả năng chỉnh sửa trực tiếp vào file."

## 2. Problem
Currently, generating UI code requires humans to describe layouts via text. This leads to back-and-forth iteration to fix margins, colors, and structure. There is no streamlined tool for the agent to ingest a visual mockup and directly patch a target file with the synthesized UI code.

## 3. Desired Outcome
- Provide a dedicated subagent or tool (`visual_ui_forge`) that accepts an image path and a target file path.
- The tool uses a multimodal model to understand the visual design and current code.
- It automatically updates the target file to match the mockup's design, preserving non-UI logic (hooks, state).

## 4. Proposed Direction
Create a `visual_ui_forge` tool that wraps a Gemini Multimodal API call. It will read the image and the code, generate the necessary changes, and then use the file editing mechanism (like replace or unified diff) to apply the changes to the target file.

## 5. Non-Goals
- We will not implement a standalone UI designer app. This is strictly a CLI tool/agent capability.
- We will not attempt to compile and screenshot the code autonomously to do a feedback loop in phase 1 (only one-shot generation based on the provided mockup).

## 6. Hidden Implications
- **Token Limits:** Images consume tokens. We must ensure the resolution is optimized or manageable.
- **Destructive Edits:** Replacing React components might accidentally delete critical business logic or state hooks.

## 7. Ambiguity
- **Blocking:** How do we ensure the agent doesn't strip out state/hooks? 
  *Resolution:* The prompt to the multimodal model MUST strictly instruct it to preserve all existing `useEffect`, `useState`, and event handlers.
- **Non-Blocking:** Styling framework. We will assume Vanilla CSS or the project's existing framework (e.g., Tailwind).

## 8. Spec Seeds
- `WHEN` `visual_ui_forge` is called with a mockup image `AND` a target file, `THEN` the file is updated.
- `WHEN` the target file contains state variables, `THEN` the generated code must retain them.
