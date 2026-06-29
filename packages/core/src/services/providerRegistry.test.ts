/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ProviderRegistry } from './providerRegistry.js';
import { Storage } from '../config/storage.js';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('../config/storage.js', () => ({
  Storage: {
    getGlobalGeminiDir: vi.fn(),
  },
}));

describe('ProviderRegistry.loadFromGlobalConfig', () => {
  let registry: ProviderRegistry;
  const mockGlobalDir = '/mock/global/vesta';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(Storage.getGlobalGeminiDir).mockReturnValue(mockGlobalDir);
    registry = ProviderRegistry.getInstance();
    registry.clear();
    // Opt-in Gemini: clear env to avoid leakage from host shell
    delete process.env['GEMINI_API_KEY'];
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function setupYaml(content: string) {
    const providersPath = path.join(mockGlobalDir, 'providers.yaml');
    vi.mocked(fs.existsSync).mockImplementation((p) => p === providersPath);
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if (p === providersPath) return content;
      return '';
    });
  }

  it('loads availableModels from YAML into registry', async () => {
    setupYaml(`
providers:
  minimax:
    type: openai-compatible
    baseUrl: https://api.minimax.io/v1
    apiKey: sk-test
    defaultModel: MiniMax-M3
    availableModels:
      - MiniMax-M3
      - MiniMax-M2.7
      - MiniMax-M2.5
`);

    await registry.loadFromGlobalConfig();

    const cfg = registry.getProviderConfig('minimax');
    expect(cfg).toBeDefined();
    expect(cfg?.availableModels).toEqual([
      'MiniMax-M3',
      'MiniMax-M2.7',
      'MiniMax-M2.5',
    ]);
  });

  it('handles missing availableModels gracefully', async () => {
    setupYaml(`
providers:
  deepseek:
    type: openai-compatible
    baseUrl: https://api.deepseek.com
    defaultModel: deepseek-v4-flash
`);

    await registry.loadFromGlobalConfig();

    const cfg = registry.getProviderConfig('deepseek');
    expect(cfg).toBeDefined();
    expect(cfg?.availableModels).toBeUndefined();
    expect(cfg?.defaultModel).toBe('deepseek-v4-flash');
  });

  it('preserves availableModels through env var expansion', async () => {
    vi.stubEnv('TEST_API_KEY', 'sk-from-env');
    setupYaml(`
providers:
  openai:
    type: openai-compatible
    baseUrl: https://api.openai.com/v1
    apiKey: \${env:TEST_API_KEY}
    defaultModel: gpt-4o
    availableModels:
      - gpt-4o
      - gpt-4o-mini
`);

    await registry.loadFromGlobalConfig();

    const cfg = registry.getProviderConfig('openai');
    expect(cfg?.apiKey).toBe('sk-from-env');
    expect(cfg?.availableModels).toEqual(['gpt-4o', 'gpt-4o-mini']);
  });

  it('does not throw on malformed YAML', async () => {
    setupYaml('this is: not: valid: yaml: : ::');

    await expect(registry.loadFromGlobalConfig()).resolves.not.toThrow();
  });

  it('returns empty registry when providers.yaml does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    delete process.env['GEMINI_API_KEY'];

    await registry.loadFromGlobalConfig();

    expect(registry.getAllProviders().size).toBe(0);
  });
});
