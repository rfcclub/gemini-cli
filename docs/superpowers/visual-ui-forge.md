# Visual UI Forge

Visual UI Forge is a multimodal design-to-code refinement tool that lets you
align frontend styling files directly against visual image mockups. This tool
uses Gemini's native vision processing capabilities to deliver pixel-perfect
visual equivalence.

Manually adjusting paddings, color gradients, and alignments to match high-
fidelity Figma designs is tedious. Visual UI Forge automates this process by
comparing screenshots directly against code files.

---

## How It Works

The multimodal UI alignment tool is executed by Vesta when visual refinements
are required.

1. **Multimodal Packaging:** The tool accepts the absolute file path of an image
   (PNG, JPG, WebP) and the target source code file (React, HTML, CSS).
2. **Vision Analysis:** The tool reads the image, encodes it to base64, loads
   the code file, and transmits both as parts to the Gemini multimodal API.
3. **Restricted Styling Optimization:** The model compares the image with the
   code, generating layout adjustments (margins, paddings, color tokens).
4. **Logic Preservation Guard:** A post-process validator checks that essential
   React logic, states, and hooks are unchanged, writing only style updates.

---

## Example Usage

You can ask the agent to refine a component using a mockup screenshot.

To refine a card component, use a command similar to the following:

```
Vesta, please refine src/components/Card.tsx using the mockup design at
/home/thoor/designs/card-mockup.png
```

Vesta will automatically invoke the `visual_ui_forge` tool, perform the vision-
based comparison, and write the refined styles directly into your Card file.
