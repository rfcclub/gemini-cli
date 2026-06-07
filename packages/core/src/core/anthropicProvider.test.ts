/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from './anthropicProvider.js';
import type { GenerateContentParameters } from '@google/genai';
import { LlmRole } from '../telemetry/llmRole.js';

describe('AnthropicProvider', () => {
  const mockConfig = {
    type: 'anthropic' as const,
    apiKey: 'sk-ant-test',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-sonnet',
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should call fetch with correct Anthropic format', async () => {
    const provider = new AnthropicProvider(mockConfig);
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'Hello from Claude' }],
        usage: { input_tokens: 5, output_tokens: 5 }
      }),
    } as any);

    const request: GenerateContentParameters = {
      model: 'claude-3-sonnet',
      contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
    };

    const response = await provider.generateContent(request, 'id', LlmRole.UTILITY_TOOL);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'sk-ant-test',
          'anthropic-version': '2023-06-01',
        }),
      })
    );
    expect(response.candidates?.[0]?.content?.parts?.[0]?.text).toBe('Hello from Claude');
  });
});
