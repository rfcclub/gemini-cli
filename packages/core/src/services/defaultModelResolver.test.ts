/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../config/vestaConfig.js', () => ({
  loadVestaConfig: vi.fn(),
}));

vi.mock('./providerRegistry.js', () => ({
  ProviderRegistry: {
    getInstance: vi.fn(),
  },
}));

vi.mock('../utils/debugLogger.js', () => ({
  debugLogger: {
    warn: vi.fn(),
    log: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { loadVestaConfig } from '../config/vestaConfig.js';
import { ProviderRegistry } from './providerRegistry.js';
import { debugLogger } from '../utils/debugLogger.js';
import {
  resolveDefaultModel,
  NoProvidersConfiguredError,
  type ResolutionSource,
} from './defaultModelResolver.js';

function buildRegistry(
  providers: Record<string, { availableModels?: string[] }>,
): {
  getAllProviders: () => Map<string, { availableModels?: string[] }>;
} {
  const map = new Map(Object.entries(providers));
  return {
    getAllProviders: () => map,
  };
}

describe('resolveDefaultModel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('env VESTA_DEFAULT_MODEL overrides everything', () => {
    vi.stubEnv('VESTA_DEFAULT_MODEL', 'groq/llama-3.1-70b');
    vi.mocked(loadVestaConfig).mockReturnValue({
      defaultModel: 'deepseek/deepseek-chat',
    });
    vi.mocked(ProviderRegistry.getInstance).mockReturnValue(
      buildRegistry({
        deepseek: { availableModels: ['deepseek-chat'] },
        groq: { availableModels: ['llama-3.1-70b'] },
      }) as unknown as ProviderRegistry,
    );

    const result = resolveDefaultModel();

    expect(result).toEqual({
      provider: 'groq',
      model: 'llama-3.1-70b',
      source: 'env' as ResolutionSource,
    });
  });

  it('config.yaml.defaultModel overrides catalog order', () => {
    vi.mocked(loadVestaConfig).mockReturnValue({
      defaultModel: 'deepseek/deepseek-chat',
    });
    vi.mocked(ProviderRegistry.getInstance).mockReturnValue(
      buildRegistry({
        groq: { availableModels: ['llama-3.1-70b'] },
        deepseek: { availableModels: ['deepseek-chat'] },
      }) as unknown as ProviderRegistry,
    );

    const result = resolveDefaultModel();

    expect(result.provider).toBe('deepseek');
    expect(result.model).toBe('deepseek-chat');
    expect(result.source).toBe('config');
  });

  it('catalog first provider used when no config', () => {
    vi.mocked(loadVestaConfig).mockReturnValue(null);
    vi.mocked(ProviderRegistry.getInstance).mockReturnValue(
      buildRegistry({
        groq: { availableModels: ['llama-3.1-70b', 'mixtral-8x7b'] },
        opencode: { availableModels: ['qwen2.5-coder'] },
      }) as unknown as ProviderRegistry,
    );

    const result = resolveDefaultModel();

    expect(result.provider).toBe('groq');
    expect(result.model).toBe('llama-3.1-70b');
    expect(result.source).toBe('catalog');
  });

  it('fallback to first provider with warning when no sources', () => {
    vi.mocked(loadVestaConfig).mockReturnValue(null);
    vi.mocked(ProviderRegistry.getInstance).mockReturnValue(
      buildRegistry({
        opencode: { availableModels: ['qwen2.5-coder'] },
      }) as unknown as ProviderRegistry,
    );

    const result = resolveDefaultModel();

    expect(result.provider).toBe('opencode');
    expect(result.model).toBe('qwen2.5-coder');
    expect(result.source).toBe('fallback');
    expect(debugLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Auto-selected'),
    );
  });

  it('throws NoProvidersConfiguredError when no providers', () => {
    vi.mocked(loadVestaConfig).mockReturnValue(null);
    vi.mocked(ProviderRegistry.getInstance).mockReturnValue(
      buildRegistry({}) as unknown as ProviderRegistry,
    );

    let caught: Error | undefined;
    try {
      resolveDefaultModel();
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeInstanceOf(NoProvidersConfiguredError);
    expect(caught?.message).toMatch(/No providers configured/);
  });

  it('env without slash treated as invalid and falls through', () => {
    vi.stubEnv('VESTA_DEFAULT_MODEL', 'invalid-no-slash');
    vi.mocked(loadVestaConfig).mockReturnValue(null);
    vi.mocked(ProviderRegistry.getInstance).mockReturnValue(
      buildRegistry({
        groq: { availableModels: ['llama-3.1-70b'] },
        opencode: { availableModels: ['qwen2.5-coder'] },
      }) as unknown as ProviderRegistry,
    );

    const result = resolveDefaultModel();
    expect(result.source).toBe('catalog');
    expect(result.provider).toBe('groq');
  });
});
