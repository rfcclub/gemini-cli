/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./defaultModelResolver.js', () => ({
  resolveDefaultModel: vi.fn(),
  NoProvidersConfiguredError: class NoProvidersConfiguredError extends Error {},
}));

vi.mock('./providerRegistry.js', () => ({
  ProviderRegistry: {
    getInstance: vi.fn(),
  },
}));

vi.mock('../utils/debugLogger.js', () => ({
  debugLogger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { selectBootModel, UnknownProviderError } from './bootModelSelector.js';
import {
  resolveDefaultModel,
  NoProvidersConfiguredError,
} from './defaultModelResolver.js';
import { ProviderRegistry } from './providerRegistry.js';

function buildRegistry(
  providers: Record<
    string,
    { availableModels?: string[]; defaultModel?: string }
  >,
): unknown {
  return {
    getAllProviders: () => new Map(Object.entries(providers)),
    getProviderConfig: (name: string) => providers[name],
  };
}

describe('selectBootModel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses --provider flag when given (valid)', () => {
    vi.mocked(ProviderRegistry.getInstance).mockReturnValue(
      buildRegistry({
        groq: { availableModels: ['llama-3.1-70b'] },
      }) as never,
    );

    const result = selectBootModel('groq');

    expect(result.provider).toBe('groq');
    expect(result.model).toBe('llama-3.1-70b');
    expect(result.flagOverride).toBe(true);
    expect(result.source).toBe('flag');
  });

  it('throws UnknownProviderError when --provider not in registry', () => {
    vi.mocked(ProviderRegistry.getInstance).mockReturnValue(
      buildRegistry({
        groq: { availableModels: ['llama'] },
      }) as never,
    );

    let caught: Error | undefined;
    try {
      selectBootModel('nonexistent');
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeInstanceOf(UnknownProviderError);
    expect(caught?.message).toMatch(/Unknown provider 'nonexistent'/);
    expect(caught?.message).toMatch(/Available: groq/);
  });

  it('falls back to resolveDefaultModel when no flag', () => {
    vi.mocked(ProviderRegistry.getInstance).mockReturnValue(
      buildRegistry({}) as never,
    );
    vi.mocked(resolveDefaultModel).mockReturnValue({
      provider: 'deepseek',
      model: 'deepseek-chat',
      source: 'catalog',
    });

    const result = selectBootModel();

    expect(result.provider).toBe('deepseek');
    expect(result.model).toBe('deepseek-chat');
    expect(result.source).toBe('catalog');
    expect(result.flagOverride).toBe(false);
  });

  it('propagates NoProvidersConfiguredError from resolver', () => {
    vi.mocked(ProviderRegistry.getInstance).mockReturnValue(
      buildRegistry({}) as never,
    );
    vi.mocked(resolveDefaultModel).mockImplementation(() => {
      throw new NoProvidersConfiguredError();
    });

    expect(() => selectBootModel()).toThrow(NoProvidersConfiguredError);
  });

  it('--provider falls back to defaultModel when availableModels empty', () => {
    vi.mocked(ProviderRegistry.getInstance).mockReturnValue(
      buildRegistry({
        gemini: { defaultModel: 'gemini-2.5-pro' },
      }) as never,
    );

    const result = selectBootModel('gemini');
    expect(result.provider).toBe('gemini');
    expect(result.model).toBe('gemini-2.5-pro');
  });
});
