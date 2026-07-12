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

  it('should extract systemInstruction into top-level body.system field', async () => {
    const provider = new AnthropicProvider(mockConfig);
    const mockFetch = vi.mocked(fetch);
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'ok' }],
        usage: { input_tokens: 5, output_tokens: 2 },
      }),
    };
    mockFetch.mockResolvedValue(mockResponse as unknown as Response);

    const request: GenerateContentParameters = {
      model: 'claude-3-sonnet',
      contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
      config: {
        systemInstruction: 'You are a senior engineer named Vesta.',
      },
    };

    await provider.generateContent(request, 'id', LlmRole.UTILITY_TOOL);

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall).toBeDefined();
    const init = fetchCall?.[1];
    const body = JSON.parse(typeof init?.body === 'string' ? init.body : '');
    expect(body.system).toBe('You are a senior engineer named Vesta.');
    // System must NOT appear inside messages array
    const userMessageInMessages = body.messages?.find(
      (m: { content?: unknown }) =>
        typeof m.content === 'string' && m.content.includes('You are a senior engineer'),
    );
    expect(userMessageInMessages).toBeUndefined();
  });

  it('should not send empty system field when systemInstruction is missing', async () => {
    const provider = new AnthropicProvider(mockConfig);
    const mockFetch = vi.mocked(fetch);
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'ok' }],
        usage: { input_tokens: 5, output_tokens: 2 },
      }),
    };
    mockFetch.mockResolvedValue(mockResponse as unknown as Response);

    const request: GenerateContentParameters = {
      model: 'claude-3-sonnet',
      contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
    };

    await provider.generateContent(request, 'id', LlmRole.UTILITY_TOOL);

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall).toBeDefined();
    const init = fetchCall?.[1];
    const body = JSON.parse(typeof init?.body === 'string' ? init.body : '');
    expect(body.system).toBeUndefined();
  });

  it('should estimate token count when Anthropic returns no usage data', async () => {
    const provider = new AnthropicProvider(mockConfig);
    const mockFetch = vi.mocked(fetch);
    // No usage field at all
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'This is a response from Claude about coding.' }],
      }),
    } as unknown as Response);

    const request: GenerateContentParameters = {
      model: 'claude-3-sonnet',
      contents: [
        { role: 'user', parts: [{ text: 'Hello, please help me write a function.' }] },
      ],
    };

    const response = await provider.generateContent(request, 'id', LlmRole.UTILITY_TOOL);

    expect(response.usageMetadata).toBeDefined();
    expect(response.usageMetadata?.totalTokenCount).toBeGreaterThan(0);
    expect(response.usageMetadata?.promptTokenCount).toBeGreaterThan(0);
    expect(response.usageMetadata?.candidatesTokenCount).toBeGreaterThan(0);
  });

  it('should fall back to estimate when only output_tokens is missing', async () => {
    const provider = new AnthropicProvider(mockConfig);
    const mockFetch = vi.mocked(fetch);
    // Only input_tokens provided; output_tokens missing
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'Hello there.' }],
        usage: { input_tokens: 10 },
      }),
    } as unknown as Response);

    const request: GenerateContentParameters = {
      model: 'claude-3-sonnet',
      contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
    };

    const response = await provider.generateContent(request, 'id', LlmRole.UTILITY_TOOL);

    expect(response.usageMetadata?.promptTokenCount).toBe(10);
    expect(response.usageMetadata?.candidatesTokenCount).toBeGreaterThan(0);
    // totalTokenCount must be input + estimated output (never undefined)
    expect(response.usageMetadata?.totalTokenCount).toBeGreaterThan(10);
  });
});
