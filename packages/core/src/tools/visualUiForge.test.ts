/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { VisualUiForgeTool } from './visualUiForge.js';
import type { Config } from '../config/config.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';

// Mock HybridTokenStorage to prevent circular dependency resolution failures in Vitest
vi.mock('../mcp/token-storage/hybrid-token-storage.js', () => ({
    HybridTokenStorage: vi.fn().mockImplementation(() => ({
        getCredentials: vi.fn(),
        setCredentials: vi.fn(),
        deleteCredentials: vi.fn(),
      })),
  }));

// Mock the GenAI SDK
const mockGenerateContent = vi.fn().mockResolvedValue({
  text: '  const [count, setCount] = useState(0);\n  let x = 100;',
});

vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      })),
  }));

describe('VisualUiForgeTool', () => {
  let tempDir: string;
  let mockupFile: string;
  let targetFile: string;
  let mockConfig: Config;
  let mockMessageBus: MessageBus;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-ui-forge-test-'));
    mockupFile = path.join(tempDir, 'mockup.png');
    targetFile = path.join(tempDir, 'Component.tsx');

    fs.writeFileSync(mockupFile, 'fake image data');
    fs.writeFileSync(
      targetFile,
      '  const [count, setCount] = useState(0);\n  let x = 1;',
      'utf8',
    );

    mockConfig = {
      getTargetDir: () => tempDir,
      validatePathAccess: () => null,
    } as unknown as Config;

    mockMessageBus = {} as unknown as MessageBus;
    process.env['GEMINI_API_KEY'] = 'fake-api-key';
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('should schema define and validate params correctly', () => {
    const tool = new VisualUiForgeTool(mockConfig, mockMessageBus);
    expect(tool.name).toBe('visual_ui_forge');

    const schema = tool.getSchema();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((schema.parametersJsonSchema as any)?.required).toContain('mockupPath');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((schema.parametersJsonSchema as any)?.required).toContain('targetFilePath');
  });

  it('should successfully update component styling and return a patch', async () => {
    const tool = new VisualUiForgeTool(mockConfig, mockMessageBus);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invocation = (tool as any).createInvocation(
      {
        mockupPath: 'mockup.png',
        targetFilePath: 'Component.tsx',
      },
      mockMessageBus,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await invocation.execute({} as any);
    expect(result.error).toBeUndefined();
    expect(result.returnDisplay).toBe('Styled successfully');

    const updatedContent = fs.readFileSync(targetFile, 'utf8');
    expect(updatedContent).toContain('let x = 100;');
    expect(updatedContent).toContain('const [count, setCount]');
  });

  it('should reject updates that modify React hook counts', async () => {
    // Mock model to remove the state hook
    mockGenerateContent.mockResolvedValueOnce({
      text: '  let x = 100;', // missing useState hook!
    });

    const tool = new VisualUiForgeTool(mockConfig, mockMessageBus);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invocation = (tool as any).createInvocation(
      {
        mockupPath: 'mockup.png',
        targetFilePath: 'Component.tsx',
      },
      mockMessageBus,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await invocation.execute({} as any);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('React state/hook mismatch detected for useState');
  });
});
