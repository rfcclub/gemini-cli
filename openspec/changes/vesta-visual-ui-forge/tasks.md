## 1. Tool Creation & Registry

- [ ] 1.1 Create the `visualUiForge.ts` tool file under
      `packages/core/src/tools/` and register it in
      `packages/core/src/tools/tool-names.ts` and tool registries.
- [ ] 1.2 Implement absolute path verification and image mime-type checking
      (supporting `.png`, `.jpg`, `.jpeg`, `.webp`).
- [ ] 1.3 Create helper functions to read and compile binary images to base64
      `inlineData` part models.

## 2. Multimodal API & Prompt Engineering

- [ ] 2.1 Structure the GenAI API call to include both the image parts and
      target file contents in the request.
- [ ] 2.2 Implement the visual-style system instruction block to restrict model
      changes to visual/CSS properties.
- [ ] 2.3 Write unit tests validating that the API payload is compiled with
      correct mimeTypes and content blocks.

## 3. Post-Process Safety & Validation

- [ ] 3.1 Implement component integrity checks comparing key non-style nodes
      (hooks, imports, state variables) between original and replacement
      contents.
- [ ] 3.2 Add end-to-end integration tests verifying correct styling refinements
      on mock component mockups.
