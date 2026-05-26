## Context

Gemini stands out due to its superior native multimodal vision processing. This
design introduces a new tool `visual_ui_forge` inside the `packages/core`
package to enable automated, vision-driven frontend styling updates.

## Goals / Non-Goals

**Goals:**

- Implement `visual_ui_forge` tool taking a mockup path (image) and target file
  path (React, HTML, CSS).
- Structure and execute a multimodal vision prompt using the Google GenAI SDK.
- Safely update the styling classes/variables of the target code file based on
  visual feedback.

**Non-Goals:**

- Generating backend logic or routing structures from the image (the tool
  strictly focuses on styling, colors, layout, and visual fidelity).

## Decisions

### 1. Tool Signature and Parameterization

- **Decision**: Define a new Tool class `VisualUiForgeTool` with arguments:
  ```json
  {
    "mockupPath": "string (absolute path to png/jpg)",
    "targetFilePath": "string (absolute path to tsx/css)"
  }
  ```
- **Rationale**: Keeps the tool simple, targeted, and easy for the agent to
  invoke during layout adjustments.

### 2. Base64 Multimodal Request Packing

- **Context**: The GenAI SDK requires image payloads to be structured as
  `inlineData` containing `mimeType` and `data` (base64 string).
- **Decision**: The tool SHALL read the file, detect the mime type by extension,
  encode it to base64 using `fs.readFileSync(path).toString('base64')`, and pack
  it as a part alongside the target file contents.

### 3. Dedicated Layout Alignment System Prompt

- **Context**: The model must focus purely on styling details without rewriting
  functional React hooks or state management.
- **Decision**: Force a strict system instruction for the vision call:
  > "Identify visual layout gaps in margin, padding, typography, color scheme,
  > and alignment. Emit a modified version of the target code file correcting
  > only the styles/classes. Absolutely DO NOT modify any states, hooks, or
  > functional programming logic."

## Risks / Trade-offs

- **Risk: Accidental rewrite of functional components**
  - _Description_: The LLM might output a simplified component that removes
    vital functional logic to match the UI.
  - _Mitigation_: We will perform a post-process verification: if the number of
    React state hooks (`useState`, `useEffect`) or functional parameters in the
    output is different from the original file, reject the output and request a
    style-only revision.
