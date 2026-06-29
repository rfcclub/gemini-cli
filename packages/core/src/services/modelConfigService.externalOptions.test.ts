/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelConfigService } from './modelConfigService.js';
import { ProviderRegistry } from './providerRegistry.js';
import type { ModelConfigServiceConfig } from './modelConfigService.js';

const baseConfig: ModelConfigServiceConfig = {
  modelDefinitions: {},
  aliases: {},
};

describe('ModelConfigService.getAvailableModelOptions — external catalog', () => {
  let registry: ProviderRegistry;
  let service: ModelConfigService;

  beforeEach(() => {
    registry = ProviderRegistry.getInstance();
    registry.clear();
    vi.spyOn(registry, 'getAllProviders').mockReturnValue(new Map());
    service = new ModelConfigService(baseConfig);
  });

  it('E1: emits one option per model when availableModels is non-empty', () => {
    const providers = new Map();
    providers.set('minimax', {
      type: 'openai-compatible' as const,
      defaultModel: 'MiniMax-M3',
      availableModels: ['MiniMax-M3', 'MiniMax-M2.7', 'MiniMax-M2.5'],
    });
    vi.spyOn(registry, 'getAllProviders').mockReturnValue(providers);

    const options = service.getAvailableModelOptions({});
    const external = options.filter((o) => o.tier === 'external');

    expect(external.map((o) => o.modelId)).toEqual([
      'minimax/MiniMax-M3',
      'minimax/MiniMax-M2.7',
      'minimax/MiniMax-M2.5',
    ]);
  });

  it('E2: emits one defaultModel option when availableModels is undefined', () => {
    const providers = new Map();
    providers.set('legacy-provider', {
      type: 'openai-compatible' as const,
      defaultModel: 'some-model',
    });
    vi.spyOn(registry, 'getAllProviders').mockReturnValue(providers);

    const options = service.getAvailableModelOptions({});
    const external = options.filter((o) => o.tier === 'external');

    expect(external).toHaveLength(1);
    expect(external[0].modelId).toBe('legacy-provider/some-model');
  });

  it('E3: falls back to defaultModel when availableModels is empty', () => {
    const providers = new Map();
    providers.set('empty-catalog', {
      type: 'openai-compatible' as const,
      defaultModel: 'some-model',
      availableModels: [],
    });
    vi.spyOn(registry, 'getAllProviders').mockReturnValue(providers);

    const options = service.getAvailableModelOptions({});
    const external = options.filter((o) => o.tier === 'external');

    expect(external).toHaveLength(1);
    expect(external[0].modelId).toBe('empty-catalog/some-model');
  });

  it('E4: emits options for multiple providers in registry iteration order', () => {
    const providers = new Map();
    providers.set('alpha', {
      type: 'openai-compatible' as const,
      defaultModel: 'a-1',
      availableModels: ['a-1', 'a-2'],
    });
    providers.set('beta', {
      type: 'anthropic' as const,
      defaultModel: 'b-1',
      availableModels: ['b-1', 'b-2', 'b-3'],
    });
    vi.spyOn(registry, 'getAllProviders').mockReturnValue(providers);

    const options = service.getAvailableModelOptions({});
    const external = options.filter((o) => o.tier === 'external');

    expect(external.map((o) => o.modelId)).toEqual([
      'alpha/a-1',
      'alpha/a-2',
      'beta/b-1',
      'beta/b-2',
      'beta/b-3',
    ]);
  });

  it('skips providers with neither availableModels nor defaultModel', () => {
    const providers = new Map();
    providers.set('broken', { type: 'openai-compatible' as const });
    vi.spyOn(registry, 'getAllProviders').mockReturnValue(providers);

    const options = service.getAvailableModelOptions({});
    const external = options.filter((o) => o.tier === 'external');

    expect(external).toHaveLength(0);
  });

  // Regression: 2026-06-28 — UI appeared to be missing MiniMax/Xiaomi/DeepSeek
  // entries, but the registry actually exposed them all. Root cause was UI
  // pagination (maxItemsToShow=10) hiding entries with no scroll indicator.
  // This test pins the full real-world catalog so any future silent drop of
  // a provider or model will fail loudly.
  it('regression: emits all 55 models from the real ~5-vendor catalog', () => {
    const providers = new Map();
    providers.set('deepseek', {
      type: 'openai-compatible' as const,
      baseUrl: 'https://api.deepseek.com',
      defaultModel: 'deepseek-v4-flash',
      availableModels: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    });
    providers.set('minimax', {
      type: 'openai-compatible' as const,
      baseUrl: 'https://api.minimax.io/v1',
      defaultModel: 'MiniMax-M3',
      availableModels: [
        'MiniMax-M3',
        'MiniMax-M2.7',
        'MiniMax-M2.7-highspeed',
        'MiniMax-M2.5',
        'MiniMax-M2.5-highspeed',
        'MiniMax-M2.1',
        'MiniMax-M2.1-highspeed',
        'MiniMax-M2',
      ],
    });
    providers.set('groq', {
      type: 'openai-compatible' as const,
      baseUrl: 'https://api.groq.com/openai/v1',
      defaultModel: 'llama-3.3-70b-versatile',
      availableModels: [
        'qwen/qwen3-32b',
        'meta-llama/llama-4-scout-17b-16e-instruct',
        'openai/gpt-oss-120b',
        'qwen/qwen3.6-27b',
        'llama-3.3-70b-versatile',
        'openai/gpt-oss-20b',
        'llama-3.1-8b-instant',
        'groq/compound',
        'groq/compound-mini',
        'canopylabs/orpheus-v1-english',
        'canopylabs/orpheus-arabic-saudi',
        'whisper-large-v3',
        'whisper-large-v3-turbo',
        'meta-llama/llama-prompt-guard-2-86m',
        'meta-llama/llama-prompt-guard-2-22m',
        'allam-2-7b',
      ],
    });
    providers.set('opencode', {
      type: 'openai-compatible' as const,
      baseUrl: 'https://opencode.ai/zen/go/v1',
      defaultModel: 'deepseek-v4-flash',
      availableModels: [
        'kimi-k2.7-code',
        'kimi-k2.6',
        'kimi-k2.5',
        'qwen3.7-max',
        'qwen3.7-plus',
        'qwen3.6-plus',
        'qwen3.5-plus',
        'glm-5.2',
        'glm-5.1',
        'glm-5',
        'deepseek-v4-pro',
        'deepseek-v4-flash',
        'mimo-v2.5-pro',
        'mimo-v2.5',
        'mimo-v2-pro',
        'mimo-v2-omni',
        'minimax-m3',
        'minimax-m2.7',
        'minimax-m2.5',
        'hy3-preview',
      ],
    });
    providers.set('xiaomi', {
      type: 'anthropic' as const,
      baseUrl: 'https://token-plan-sgp.xiaomimimo.com/anthropic',
      defaultModel: 'mimo-v2.5',
      availableModels: [
        'mimo-v2-omni',
        'mimo-v2-pro',
        'mimo-v2-tts',
        'mimo-v2.5',
        'mimo-v2.5-asr',
        'mimo-v2.5-pro',
        'mimo-v2.5-tts',
        'mimo-v2.5-tts-voiceclone',
        'mimo-v2.5-tts-voicedesign',
      ],
    });
    vi.spyOn(registry, 'getAllProviders').mockReturnValue(providers);

    const options = service.getAvailableModelOptions({});
    const external = options.filter((o) => o.tier === 'external');
    const externalIds = external.map((o) => o.modelId);

    // 2 + 8 + 16 + 20 + 9 = 55
    expect(external).toHaveLength(55);

    // Spot-check every MiniMax model from the real catalog.
    for (const m of [
      'MiniMax-M3',
      'MiniMax-M2.7',
      'MiniMax-M2.7-highspeed',
      'MiniMax-M2.5',
      'MiniMax-M2.5-highspeed',
      'MiniMax-M2.1',
      'MiniMax-M2.1-highspeed',
      'MiniMax-M2',
    ]) {
      expect(externalIds).toContain(`minimax/${m}`);
    }

    // Spot-check every Xiaomi model from the real catalog.
    for (const m of [
      'mimo-v2-omni',
      'mimo-v2-pro',
      'mimo-v2-tts',
      'mimo-v2.5',
      'mimo-v2.5-asr',
      'mimo-v2.5-pro',
      'mimo-v2.5-tts',
      'mimo-v2.5-tts-voiceclone',
      'mimo-v2.5-tts-voicedesign',
    ]) {
      expect(externalIds).toContain(`xiaomi/${m}`);
    }

    // DeepSeek must show BOTH v4-flash and v4-pro.
    expect(externalIds).toContain('deepseek/deepseek-v4-flash');
    expect(externalIds).toContain('deepseek/deepseek-v4-pro');

    // External options must come BEFORE any non-external (gemini) option
    // so the user sees them at the top of the picker. Assert the FIRST
    // option is always external regardless of whether Gemini models exist.
    expect(options[0].tier).toBe('external');
    expect(options[options.length - 1].tier).toBe('external');
  });
});
