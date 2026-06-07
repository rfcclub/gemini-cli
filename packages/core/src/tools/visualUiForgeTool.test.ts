/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { getVisualUiForgeDeclaration } from './visualUiForgeTool.js';
import { VISUAL_UI_FORGE_TOOL_NAME } from './tool-names.js';

describe('VisualUiForgeTool', () => {
  it('returns the correct tool declaration', () => {
    const decl = getVisualUiForgeDeclaration();
    expect(decl.base.name).toBe(VISUAL_UI_FORGE_TOOL_NAME);
    expect(decl.base.parameters?.required).toContain('mockupPath');
    expect(decl.base.parameters?.required).toContain('targetFilePath');
  });
});
