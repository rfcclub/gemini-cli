/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildAvailableModels } from './acpUtils.js';
import { ProviderRegistry } from '@google/gemini-cli-core';
import type { Config } from '@google/gemini-cli-core';
import type { LoadedSettings } from '../config/settings.js';

function makeMockConfig(overrides: Partial<Config> = {}): Config {
  return {
    getModel: vi.fn().mockReturnValue('auto'),
    getHasAccessToPreviewModel: vi.fn().mockReturnValue(false),
    getGemini31LaunchedSync: vi.fn().mockReturnValue(false),
    hasGemini35FlashGAAccess: vi.fn().mockReturnValue(false),
    getExperimentalDynamicModelConfiguration: vi.fn().mockReturnValue(false),
    ...overrides,
  } as unknown as Config;
}

function makeMockSettings(): LoadedSettings {
  return {
    merged: {
      security: { auth: { selectedType: 'USE_GEMINI' } },
    },
  } as unknown as LoadedSettings;
}

describe('buildAvailableModels — external catalog wiring', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = ProviderRegistry.getInstance();
    registry.clear();
  });

  it('E5: dynamic path includes external catalog from getAvailableModelOptions', () => {
    const mockService = {
      getAvailableModelOptions: vi.fn().mockReturnValue([
        {
          modelId: 'minimax/MiniMax-M3',
          name: 'minimax · MiniMax-M3',
          description: '',
          tier: 'external',
        },
        {
          modelId: 'minimax/MiniMax-M2.7',
          name: 'minimax · MiniMax-M2.7',
          description: '',
          tier: 'external',
        },
        {
          modelId: 'gemini-pro',
          name: 'Gemini Pro',
          description: '',
          tier: 'auto',
        },
      ]),
    };
    const config = makeMockConfig({
      getExperimentalDynamicModelConfiguration: vi.fn().mockReturnValue(true),
      getModelConfigService: vi.fn().mockReturnValue(mockService),
    });

    const result = buildAvailableModels(config, makeMockSettings());
    const ids = result.availableModels.map((m) => m.modelId);

    expect(ids).toContain('minimax/MiniMax-M3');
    expect(ids).toContain('minimax/MiniMax-M2.7');
    expect(ids).toContain('gemini-pro');
  });

  it('E6: legacy path includes external catalog when ProviderRegistry has providers', () => {
    registry.registerProvider('minimax', {
      type: 'openai-compatible',
      baseUrl: 'https://api.minimax.io/v1',
      apiKey: 'sk-test',
      defaultModel: 'MiniMax-M3',
      availableModels: ['MiniMax-M3', 'MiniMax-M2.7'],
    });

    const config = makeMockConfig();
    const result = buildAvailableModels(config, makeMockSettings());
    const ids = result.availableModels.map((m) => m.modelId);

    expect(ids).toContain('minimax/MiniMax-M3');
    expect(ids).toContain('minimax/MiniMax-M2.7');
    // Legacy Gemini options still present
    expect(ids).toContain('auto');
  });

  it('E7: empty ProviderRegistry does not error and returns only legacy Gemini options', () => {
    const config = makeMockConfig();
    const result = buildAvailableModels(config, makeMockSettings());
    const ids = result.availableModels.map((m) => m.modelId);

    expect(result.availableModels.length).toBeGreaterThan(0);
    // No external IDs without prefix slash
    const external = ids.filter(
      (id) => id.includes('/MiniMax') || id.includes('provider/'),
    );
    expect(external).toHaveLength(0);
  });

  it('E8: legacy path falls back to defaultModel for provider without availableModels', () => {
    registry.registerProvider('legacy', {
      type: 'openai-compatible',
      defaultModel: 'legacy-model',
    });

    const config = makeMockConfig();
    const result = buildAvailableModels(config, makeMockSettings());
    const ids = result.availableModels.map((m) => m.modelId);

    expect(ids).toContain('legacy/legacy-model');
  });
});

describe('buildAvailableModels — production default', () => {
  it('E9: production default (dynamicModelConfiguration=false) includes external catalog', () => {
    const registry = ProviderRegistry.getInstance();
    registry.clear();
    registry.registerProvider('minimax', {
      type: 'openai-compatible',
      baseUrl: 'https://api.minimax.io/v1',
      apiKey: 'sk-test',
      defaultModel: 'MiniMax-M3',
      availableModels: ['MiniMax-M3', 'MiniMax-M2.7', 'MiniMax-M2.5'],
    });

    // Simulate production: dynamicModelConfiguration defaults to false
    const config = {
      getModel: vi.fn().mockReturnValue('auto'),
      getHasAccessToPreviewModel: vi.fn().mockReturnValue(false),
      getGemini31LaunchedSync: vi.fn().mockReturnValue(false),
      hasGemini35FlashGAAccess: vi.fn().mockReturnValue(false),
      getExperimentalDynamicModelConfiguration: vi.fn().mockReturnValue(false), // <-- production default
    } as unknown as Config;

    const settings = {
      merged: { security: { auth: { selectedType: 'USE_GEMINI' } } },
    } as unknown as LoadedSettings;

    const result = buildAvailableModels(config, settings);
    const ids = result.availableModels.map((m) => m.modelId);

    expect(ids).toContain('minimax/MiniMax-M3');
    expect(ids).toContain('minimax/MiniMax-M2.7');
    expect(ids).toContain('minimax/MiniMax-M2.5');
  });
});

describe('TUI ModelDialog manualOptions — external catalog (regression for user report)', () => {
  it('R1: legacy manualOptions must include external catalog (regression)', () => {
    // User report: "1 default model thấy, model khác không thấy"
    // Root cause: ModelDialog.manualOptions legacy path hardcoded Gemini models.
    // After fix, external catalog from providers.yaml should appear.
    const registry = ProviderRegistry.getInstance();
    registry.clear();
    registry.registerProvider('minimax', {
      type: 'openai-compatible',
      baseUrl: 'https://api.minimax.io/v1',
      apiKey: 'sk-test',
      defaultModel: 'MiniMax-M3',
      availableModels: ['MiniMax-M3', 'MiniMax-M2.7', 'MiniMax-M2.5'],
    });
    registry.registerProvider('deepseek', {
      type: 'openai-compatible',
      baseUrl: 'https://api.deepseek.com',
      apiKey: 'sk-test',
      defaultModel: 'deepseek-v4-flash',
      availableModels: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    });

    // Production default
    const config = {
      getModel: vi.fn().mockReturnValue('auto'),
      getHasAccessToPreviewModel: vi.fn().mockReturnValue(false),
      getGemini31LaunchedSync: vi.fn().mockReturnValue(false),
      hasGemini35FlashGAAccess: vi.fn().mockReturnValue(false),
      getExperimentalDynamicModelConfiguration: vi.fn().mockReturnValue(false),
    } as unknown as Config;

    const settings = {
      merged: { security: { auth: { selectedType: 'USE_GEMINI' } } },
    } as unknown as LoadedSettings;

    const result = buildAvailableModels(config, settings);
    const ids = result.availableModels.map((m) => m.modelId);

    // External catalog MUST appear in legacy path output
    expect(ids).toContain('minimax/MiniMax-M3');
    expect(ids).toContain('minimax/MiniMax-M2.7');
    expect(ids).toContain('minimax/MiniMax-M2.5');
    expect(ids).toContain('deepseek/deepseek-v4-flash');
    expect(ids).toContain('deepseek/deepseek-v4-pro');
  });
});
