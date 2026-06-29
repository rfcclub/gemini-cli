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

describe('ProviderRegistry.opt-in Gemini', () => {
  let registry: ProviderRegistry;
  const mockGlobalDir = '/mock/vesta-home';
  const providersPath = path.join(mockGlobalDir, 'providers.yaml');

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(Storage.getGlobalGeminiDir).mockReturnValue(mockGlobalDir);
    registry = ProviderRegistry.getInstance();
    registry.clear();
    // providers.yaml absent by default; tests opt-in via existsSync mock
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does NOT register gemini when GEMINI_API_KEY is unset', async () => {
    delete process.env['GEMINI_API_KEY'];
    await registry.loadFromGlobalConfig();

    expect(registry.getProviderConfig('gemini')).toBeUndefined();
    expect(registry.getAllProviders().has('gemini')).toBe(false);
  });

  it('does NOT register gemini when GEMINI_API_KEY is empty string', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    await registry.loadFromGlobalConfig();

    expect(registry.getProviderConfig('gemini')).toBeUndefined();
  });

  it('registers gemini when GEMINI_API_KEY is set', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key-123');
    await registry.loadFromGlobalConfig();

    const cfg = registry.getProviderConfig('gemini');
    expect(cfg).toBeDefined();
    expect(cfg?.type).toBe('google');
    expect(cfg?.apiKey).toBe('test-key-123');
    expect(cfg?.defaultModel).toBe('gemini-2.5-pro');
  });

  it('registers both gemini and catalog providers when key + catalog present', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key-123');
    vi.mocked(fs.existsSync).mockImplementation((p) => p === providersPath);
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if (p === providersPath) {
        const yaml = [
          'providers:',
          '  groq:',
          '    type: openai-compatible',
          '    baseUrl: https://api.groq.com/openai/v1',
          '    defaultModel: llama-3.1-70b',
          '    availableModels:',
          '      - llama-3.1-70b',
        ].join(String.fromCharCode(10));
        return yaml;
      }
      return '';
    });

    await registry.loadFromGlobalConfig();

    expect(registry.getProviderConfig('gemini')).toBeDefined();
    expect(registry.getProviderConfig('groq')).toBeDefined();
    expect(registry.getAllProviders().size).toBe(2);
  });

  it('catalog providers load even when GEMINI_API_KEY is absent', async () => {
    delete process.env['GEMINI_API_KEY'];
    vi.mocked(fs.existsSync).mockImplementation((p) => p === providersPath);
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if (p === providersPath) {
        const yaml = [
          'providers:',
          '  deepseek:',
          '    type: openai-compatible',
          '    baseUrl: https://api.deepseek.com',
          '    defaultModel: deepseek-chat',
          '    availableModels:',
          '      - deepseek-chat',
        ].join(String.fromCharCode(10));
        return yaml;
      }
      return '';
    });

    await registry.loadFromGlobalConfig();

    expect(registry.getProviderConfig('gemini')).toBeUndefined();
    expect(registry.getProviderConfig('deepseek')).toBeDefined();
  });
});
