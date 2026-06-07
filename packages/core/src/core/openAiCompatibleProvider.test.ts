/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAiCompatibleProvider } from './openAiCompatibleProvider.js';
import type { GenerateContentParameters } from '@google/genai';
import { LlmRole } from '../telemetry/llmRole.js';

describe('OpenAiCompatibleProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should support DeepSeek style configuration', async () => {
    const deepSeekConfig = {
      type: 'openai-compatible' as const,
      apiKey: 'sk-deepseek',
      baseUrl: 'https://api.deepseek.com',
      defaultModel: 'deepseek-coder',
    };
    const provider = new OpenAiCompatibleProvider(deepSeekConfig);
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'DeepSeek response' } }],
        usage: { total_tokens: 5 }
      }),
    } as any);

    const request: GenerateContentParameters = {
      model: 'deepseek-coder',
      contents: [{ role: 'user', parts: [{ text: 'DeepSeek?' }] }],
    };

    const response = await provider.generateContent(request, 'id', LlmRole.UTILITY_TOOL);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.deepseek.com/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer sk-deepseek',
        }),
      })
    );
    expect(response.candidates?.[0]?.content?.parts?.[0]?.text).toBe('DeepSeek response');
  });

  it('should support Ollama style configuration (no auth)', async () => {
    const ollamaConfig = {
      type: 'openai-compatible' as const,
      baseUrl: 'http://localhost:11434/v1',
      defaultModel: 'qwen2.5-coder',
    };
    const provider = new OpenAiCompatibleProvider(ollamaConfig);
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Ollama response' } }],
      }),
    } as any);

    const request: GenerateContentParameters = {
      model: 'qwen2.5-coder',
      contents: [{ role: 'user', parts: [{ text: 'Ollama?' }] }],
    };

    const response = await provider.generateContent(request, 'id', LlmRole.UTILITY_TOOL);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/v1/chat/completions',
      expect.objectContaining({
        headers: expect.not.objectContaining({
          'Authorization': expect.any(String),
        }),
      })
    );
    expect(response.candidates?.[0]?.content?.parts?.[0]?.text).toBe('Ollama response');
  });
});
