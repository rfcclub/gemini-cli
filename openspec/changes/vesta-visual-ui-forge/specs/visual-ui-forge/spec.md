## ADDED Requirements

### Requirement: Multimodal Payload Packaging

The system SHALL read mockup files (PNG, JPG, WebP), transform them into base64
image data structures, and transmit them as part of a multimodal request to the
Gemini API alongside the target code file.

#### Scenario: Successfully pack and send image and code

- **WHEN** the `visual_ui_forge` tool is invoked with a valid image path
  `/tmp/mockup.png` and a React file path `/src/components/Card.tsx`
- **THEN** the system SHALL read the image, package it into the base64 part,
  load the React file content, and query the Gemini API with multimodal
  instructions.

### Requirement: Incremental Component Styling

The system SHALL extract CSS or Tailwind utility class improvements returned by
the Gemini vision model and write them back into the target source code file.

#### Scenario: Apply visual alignments to React file

- **WHEN** the vision model returns a list of style edits (e.g. changing `p-2`
  to `p-6` to match padding, and `bg-red-500` to HSL themed gradient)
- **THEN** the system SHALL parse these edits and write them back into
  `/src/components/Card.tsx` cleanly.
