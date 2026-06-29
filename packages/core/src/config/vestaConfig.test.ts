/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock('../config/storage.js', () => ({
  Storage: {
    getGlobalGeminiDir: vi.fn(),
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

// Static imports after mocks are hoisted
import { Storage } from '../config/storage.js';
import { debugLogger } from '../utils/debugLogger.js';
import { loadVestaConfig, VestaConfigParseError } from './vestaConfig.js';

const NL = String.fromCharCode(10);

describe('loadVestaConfig', () => {
  const mockGlobalDir = '/mock/vesta-home';
  const configPath = path.join(mockGlobalDir, 'config.yaml');

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(Storage.getGlobalGeminiDir).mockReturnValue(mockGlobalDir);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function setupConfig(content: string | null, mode = 0o644): void {
    if (content === null) {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      return;
    }
    vi.mocked(fs.existsSync).mockImplementation(
      (p) => (p as string) === configPath,
    );
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if ((p as string) === configPath) return content;
      return '';
    });
    vi.mocked(fs.statSync).mockImplementation(() => ({ mode }) as fs.Stats);
  }

  it('returns null when config.yaml does not exist', () => {
    setupConfig(null);
    expect(loadVestaConfig()).toBeNull();
  });

  it('parses valid config with all fields', () => {
    const yaml =
      'defaultModel: groq/llama-3.1-70b' +
      NL +
      'defaultProvider: groq' +
      NL +
      'geminiApiKey: test-key' +
      NL;
    setupConfig(yaml, 0o600);
    const cfg = loadVestaConfig();
    expect(cfg).toEqual({
      defaultModel: 'groq/llama-3.1-70b',
      defaultProvider: 'groq',
      geminiApiKey: 'test-key',
    });
  });

  it('parses valid config with only some fields', () => {
    setupConfig('defaultProvider: deepseek' + NL, 0o600);
    const cfg = loadVestaConfig();
    expect(cfg).toEqual({ defaultProvider: 'deepseek' });
  });

  it('throws VestaConfigParseError on malformed YAML', () => {
    setupConfig('{ malformed: yaml: ::: }', 0o600);
    expect(() => loadVestaConfig()).toThrow(VestaConfigParseError);
  });

  it('warns when permissions are loose and geminiApiKey is set', () => {
    setupConfig('geminiApiKey: secret' + NL, 0o644);
    loadVestaConfig();
    expect(debugLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('chmod 600'),
    );
  });

  it('does not warn when permissions are 0600', () => {
    setupConfig('geminiApiKey: secret' + NL, 0o600);
    loadVestaConfig();
    expect(debugLogger.warn).not.toHaveBeenCalled();
  });

  it('does not warn on loose permissions when geminiApiKey is absent', () => {
    setupConfig('defaultModel: groq/llama' + NL, 0o644);
    loadVestaConfig();
    expect(debugLogger.warn).not.toHaveBeenCalled();
  });
});
