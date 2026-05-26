/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import * as Diff from 'diff';
import { GoogleGenAI } from '@google/genai';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
  type ToolInvocation,
  type ToolLocation,
  type ToolResult,
  type PolicyUpdateOptions,
  type ToolConfirmationOutcome,
  type ExecuteOptions,
} from './tools.js';
import { ToolErrorType } from './tool-error.js';
import { buildFilePathArgsPattern } from '../policy/utils.js';
import { makeRelative, shortenPath } from '../utils/paths.js';
import type { Config } from '../config/config.js';

export interface VisualUiForgeParams {
  mockupPath: string;
  targetFilePath: string;
}

export function isVisualUiForgeParams(args: unknown): args is VisualUiForgeParams {
  if (typeof args !== 'object' || args === null) {
    return false;
  }
  return (
    'mockupPath' in args &&
    typeof args.mockupPath === 'string' &&
    'targetFilePath' in args &&
    typeof args.targetFilePath === 'string'
  );
}

class VisualUiForgeInvocation extends BaseToolInvocation<
  VisualUiForgeParams,
  ToolResult
> {
  private readonly resolvedMockupPath: string;
  private readonly resolvedTargetPath: string;

  constructor(
    private config: Config,
    params: VisualUiForgeParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
    this.resolvedMockupPath = path.resolve(this.config.getTargetDir(), this.params.mockupPath);
    this.resolvedTargetPath = path.resolve(this.config.getTargetDir(), this.params.targetFilePath);
  }

  getDescription(): string {
    const relMockup = makeRelative(this.resolvedMockupPath, this.config.getTargetDir());
    const relTarget = makeRelative(this.resolvedTargetPath, this.config.getTargetDir());
    return `Style component ${shortenPath(relTarget)} based on mockup ${shortenPath(relMockup)}`;
  }

  override toolLocations(): ToolLocation[] {
    return [
      { path: this.resolvedMockupPath },
      { path: this.resolvedTargetPath },
    ];
  }

  override getPolicyUpdateOptions(
    _outcome: ToolConfirmationOutcome,
  ): PolicyUpdateOptions | undefined {
    return {
      argsPattern: buildFilePathArgsPattern(this.params.targetFilePath),
    };
  }

  /**
   * Helper to count React hook usages in code to prevent logic modification.
   */
  private countReactHooks(code: string): Record<string, number> {
    const hooks = ['useState', 'useEffect', 'useMemo', 'useCallback', 'useContext', 'useRef', 'useReducer'];
    const counts: Record<string, number> = {};
    for (const hook of hooks) {
      const regex = new RegExp(`\\b${hook}\\b`, 'g');
      const matches = code.match(regex);
      counts[hook] = matches ? matches.length : 0;
    }
    return counts;
  }

  async execute(_options: ExecuteOptions): Promise<ToolResult> {
    // Validate path access
    const mockupValidationError = this.config.validatePathAccess(this.resolvedMockupPath, 'read');
    if (mockupValidationError) {
      return {
        llmContent: mockupValidationError,
        returnDisplay: 'Mockup path not in workspace.',
        error: { message: mockupValidationError, type: ToolErrorType.PATH_NOT_IN_WORKSPACE },
      };
    }

    const targetValidationError = this.config.validatePathAccess(this.resolvedTargetPath, 'write');
    if (targetValidationError) {
      return {
        llmContent: targetValidationError,
        returnDisplay: 'Target file path not in workspace.',
        error: { message: targetValidationError, type: ToolErrorType.PATH_NOT_IN_WORKSPACE },
      };
    }

    // Verify files exist
    if (!fs.existsSync(this.resolvedMockupPath)) {
      return {
        llmContent: `Mockup file not found: ${this.resolvedMockupPath}`,
        returnDisplay: 'Mockup file not found.',
        error: { message: `Mockup file not found at ${this.resolvedMockupPath}`, type: ToolErrorType.FILE_NOT_FOUND },
      };
    }

    if (!fs.existsSync(this.resolvedTargetPath)) {
      return {
        llmContent: `Target file not found: ${this.resolvedTargetPath}`,
        returnDisplay: 'Target file not found.',
        error: { message: `Target file not found at ${this.resolvedTargetPath}`, type: ToolErrorType.FILE_NOT_FOUND },
      };
    }

    try {
      const originalCode = fs.readFileSync(this.resolvedTargetPath, 'utf8');

      // Load API Key
      const { loadApiKey } = await import('../core/apiKeyCredentialStorage.js');
      const apiKey = process.env['GEMINI_API_KEY'] || (await loadApiKey());
      if (!apiKey) {
        return {
          llmContent: 'Failed to authorize. GEMINI_API_KEY env or keychain key is missing.',
          returnDisplay: 'API Key missing.',
          error: { message: 'Google GenAI authorization key missing', type: ToolErrorType.PERMISSION_DENIED },
        };
      }

      // Initialize GenAI SDK
      const ai = new GoogleGenAI({ apiKey });

      // Read mockup image
      const imageBase64 = fs.readFileSync(this.resolvedMockupPath).toString('base64');
      const ext = path.extname(this.resolvedMockupPath).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType,
        },
      };

      const codePart = {
        text: `Here is the current target code file to be styled:\n\n${originalCode}`,
      };

      const systemInstruction = `You are an expert Frontend Forge Master. Your task is to analyze the visual mockup image and align the styling (margin, padding, typography, color scheme, layout alignment) of the target code file to match it perfectly.

CRITICAL SAFETY REQUIREMENT: You MUST ONLY modify CSS classes, style properties, inline styling, and design variables. Absolutely DO NOT add, remove, or modify any React hooks (e.g. useState, useEffect, useMemo, useCallback, useContext, useRef), component state, parameters, function calls, event handlers, or functional programming logic.

Output ONLY the raw, complete source code of the modified file. Do not wrap the code in markdown code blocks.`;

      // Call Gemini 2.5 Flash
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [imagePart, codePart],
        config: {
          systemInstruction,
          temperature: 0.1, // low temperature for precise styling updates
        },
      });

      let modifiedCode = response.text || '';
      // Strip markdown code block wrapper if present
      modifiedCode = modifiedCode.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');

      if (!modifiedCode || modifiedCode.trim() === '') {
        return {
          llmContent: 'Gemini model returned empty styling updates.',
          returnDisplay: 'Styling update failed: Empty output.',
          error: { message: 'GenAI returned empty output', type: ToolErrorType.EXECUTION_FAILED },
        };
      }

      // Safety validation: Compare React state hooks
      const origHooks = this.countReactHooks(originalCode);
      const modHooks = this.countReactHooks(modifiedCode);

      for (const hook of Object.keys(origHooks)) {
        if (origHooks[hook] !== modHooks[hook]) {
          return {
            llmContent: `Visual UI Forge rejected the styling update because it detected a modification to the functional hook: ${hook} (original count: ${origHooks[hook]}, updated count: ${modHooks[hook]}). Styling updates must be 100% logic-safe.`,
            returnDisplay: 'Rejected styling update: Hook count mismatch.',
            error: {
              message: `React state/hook mismatch detected for ${hook}`,
              type: ToolErrorType.INVALID_TOOL_PARAMS,
            },
          };
        }
      }

      // Write styled code back to the file
      fs.writeFileSync(this.resolvedTargetPath, modifiedCode, 'utf8');

      // Generate visual diff
      const patch = Diff.createTwoFilesPatch(
        'original',
        'styled',
        originalCode,
        modifiedCode,
      );

      return {
        llmContent: `Successfully applied visual styling updates to ${this.params.targetFilePath}.\n\nDiff:\n${patch}`,
        display: {
          name: 'Visual UI Forge',
          description: this.getDescription(),
          resultSummary: 'Styled successfully',
          result: { type: 'text', text: patch },
        },
        returnDisplay: 'Styled successfully',
      };
    } catch (e: any) {
      return {
        llmContent: `Failed to style target file: ${e.message}`,
        returnDisplay: 'Styling execution error.',
        error: { message: e.message, type: ToolErrorType.EXECUTION_FAILED },
      };
    }
  }
}

export class VisualUiForgeTool extends BaseDeclarativeTool<
  VisualUiForgeParams,
  ToolResult
> {
  static readonly Name = 'visual_ui_forge';

  constructor(
    private config: Config,
    messageBus: MessageBus,
  ) {
    super(
      VisualUiForgeTool.Name,
      'Visual UI Forge',
      'Style a user interface component/page based on a visual mockup image and the original code file. Safe for component state and hooks.',
      Kind.Edit,
      {
        type: 'object',
        properties: {
          mockupPath: {
            type: 'string',
            description: 'Absolute path to the reference visual mockup image (PNG or JPEG)',
          },
          targetFilePath: {
            type: 'string',
            description: 'Absolute path to the target code file (e.g. TSX, JSX, HTML, CSS) to style',
          },
        },
        required: ['mockupPath', 'targetFilePath'],
      },
      messageBus,
      true,
      false,
    );
  }

  protected override validateToolParamValues(
    params: VisualUiForgeParams,
  ): string | null {
    if (params.mockupPath.trim() === '') {
      return "The 'mockupPath' parameter must be non-empty.";
    }
    if (params.targetFilePath.trim() === '') {
      return "The 'targetFilePath' parameter must be non-empty.";
    }

    const resolvedMockup = path.resolve(this.config.getTargetDir(), params.mockupPath);
    const resolvedTarget = path.resolve(this.config.getTargetDir(), params.targetFilePath);

    const mockupError = this.config.validatePathAccess(resolvedMockup, 'read');
    if (mockupError) return mockupError;

    const targetError = this.config.validatePathAccess(resolvedTarget, 'write');
    if (targetError) return targetError;

    return null;
  }

  protected createInvocation(
    params: VisualUiForgeParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<VisualUiForgeParams, ToolResult> {
    return new VisualUiForgeInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
