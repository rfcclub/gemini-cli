## Why

Translating high-fidelity UI mockups (Figma screenshots, JPG/PNG drawings) into
pixel-perfect React/CSS code is a manual, tedious, and time-consuming process.
Developers frequently make minor mistakes in padding, color harmony, typography,
and alignment. Unlike text-only LLM assistants (e.g. Claude Code or Codex),
Gemini has native, world-class multimodal processing capabilities.

By building **Visual UI Forge**, we will leverage Gemini’s native vision
capabilities to compare an image mockup directly against a target UI component
file, automatically identify styling gaps, and rewrite/fine-tune the CSS/React
styling (Tailwind, Vanilla CSS, or Styled Components) to achieve pixel-perfect
alignment.

## What Changes

- **New Multimodal Tool (`visual_ui_forge`)**: Add a new tool to the registry
  that accepts the target code file path and the mockup image path.
- **Vision Comparison Prompting**: Implement a custom prompt generator that
  sends the image (base64 encoded) alongside the code file content to the Gemini
  API, asking for layout and style modifications.
- **Incremental Style Refinement**: The tool SHALL generate and apply code
  modifications that bridge the gap in padding, margins, colors, alignment, and
  typography.

## Capabilities

### New Capabilities

- `visual-ui-forge`: A multimodal tool that analyzes a visual mockup image and
  adjusts a React/CSS code file to achieve exact visual match.

### Modified Capabilities

_(None)_

## Impact

- **Core Package (`packages/core`)**: Adds
  `packages/core/src/tools/visualUiForge.ts` to the tool registry.
- **Multimodal Support**: Utilizes the Google GenAI SDK's image payload
  capabilities.
