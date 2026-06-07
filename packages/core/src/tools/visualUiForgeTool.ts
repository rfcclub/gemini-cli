/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Type } from '@google/genai';
import { VISUAL_UI_FORGE_TOOL_NAME } from './tool-names.js';
import type { ToolDefinition } from './definitions/types.js';

export function getVisualUiForgeDeclaration(): ToolDefinition {
  return {
    base: {
      name: VISUAL_UI_FORGE_TOOL_NAME,
      description:
        'Style a user interface component/page based on a visual mockup image and the original code file. Safe for component state and hooks.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          mockupPath: {
            type: Type.STRING,
            description:
              'Absolute path to the reference visual mockup image (PNG or JPEG)',
          },
          targetFilePath: {
            type: Type.STRING,
            description:
              'Absolute path to the target code file (e.g. TSX, JSX, HTML, CSS) to style',
          },
        },
        required: ['mockupPath', 'targetFilePath'],
      },
    },
  };
}
