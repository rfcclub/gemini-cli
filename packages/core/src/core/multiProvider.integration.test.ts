/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseLlmClient } from './baseLlmClient.js';
import { ProviderRegistry } from '../services/providerRegistry.js';
import { LlmRole } from '../telemetry/llmRole.js';

describe('Multi-provider Integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    ProviderRegistry.getInstance().clear();
    // Prevent real retry loop from trying to use getAvailabilityContext side effects
    vi.mock('../availability/policyHelpers.js', async () => {
        const actual = await vi.importActual('../availability/policyHelpers.js');
        return {
            ...actual as any,
            applyModelSelection: (_config: any, key: any) => ({
                model: key.model,
                config: {},
                maxAttempts: 1
            }),
            createAvailabilityContextProvider: () => () => undefined
        };
    });
  });

  it('should route to different providers based on model prefix', async () => {
    const registry = ProviderRegistry.getInstance();
    registry.registerProvider('deepseek', {
      type: 'openai-compatible',
      baseUrl: 'https://api.deepseek.com',
      apiKey: 'ds-key',
    });
    registry.registerProvider('anthropic', {
      type: 'anthropic',
      apiKey: 'ant-key',
    });

    const mockFetch = vi.mocked(fetch);
    mockFetch.mockImplementation(async (url) => {
      if (url.toString().includes('deepseek')) {
        return {
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: 'from deepseek' } }] }),
        } as any;
      }
      if (url.toString().includes('anthropic')) {
        return {
          ok: true,
          json: () => Promise.resolve({ content: [{ type: 'text', text: 'from claude' }] }),
        } as any;
      }
      return { ok: false, text: () => Promise.resolve('error') } as any;
    });

    const mockConfig = {
      modelConfigService: {
        getResolvedConfig: (key: any) => ({ 
            model: key.model, 
            generateContentConfig: {} 
        }),
      },
      getActiveModel: () => 'default',
      getNumericalRoutingEnabled: () => false,
      getResolvedClassifierThreshold: () => 0.5,
      isInteractive: () => false,
      getRetryFetchErrors: () => true,
      getContentGeneratorConfig: () => ({}),
    } as any;

    const mockContentGenerator = {} as any;
    const client = new BaseLlmClient(mockContentGenerator, mockConfig);

    const dsResponse = await client.generateContent({
      modelConfigKey: { model: 'deepseek:coder' } as any,
      contents: [],
      promptId: '1',
      role: LlmRole.UTILITY_TOOL,
      abortSignal: new AbortController().signal,
    });
    expect(dsResponse.candidates?.[0]?.content?.parts?.[0]?.text).toBe('from deepseek');

    const antResponse = await client.generateContent({
      modelConfigKey: { model: 'anthropic:claude' } as any,
      contents: [],
      promptId: '2',
      role: LlmRole.UTILITY_TOOL,
      abortSignal: new AbortController().signal,
    });
    expect(antResponse.candidates?.[0]?.content?.parts?.[0]?.text).toBe('from claude');
  });

  it('should support slash as a provider separator', async () => {
    const registry = ProviderRegistry.getInstance();
    registry.registerProvider('minimax', {
      type: 'openai-compatible',
      baseUrl: 'https://api.minimax.chat/v1',
      apiKey: 'mm-key',
    });

    const mockFetch = vi.mocked(fetch);
    mockFetch.mockImplementation(async (url, options: any) => {
      const body = JSON.parse(options.body);
      if (url.toString().includes('minimax') && body.model === 'MiniMax-M3') {
        return {
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: 'from minimax m3' } }],
            }),
        } as any;
      }
      return { ok: false, text: () => Promise.resolve('error') } as any;
    });

    const mockConfig = {
      modelConfigService: {
        getResolvedConfig: (key: any) => ({
          model: key.model,
          generateContentConfig: {},
        }),
      },
      getActiveModel: () => 'default',
      isInteractive: () => false,
      getRetryFetchErrors: () => true,
      getContentGeneratorConfig: () => ({}),
    } as any;

    const mockContentGenerator = {} as any;
    const client = new BaseLlmClient(mockContentGenerator, mockConfig);

    const mmResponse = await client.generateContent({
      modelConfigKey: { model: 'minimax/MiniMax-M3' } as any,
      contents: [],
      promptId: '3',
      role: LlmRole.UTILITY_TOOL,
      abortSignal: new AbortController().signal,
    });

    expect(mmResponse.candidates?.[0]?.content?.parts?.[0]?.text).toBe(
      'from minimax m3',
    );
  });
});
