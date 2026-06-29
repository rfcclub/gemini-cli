/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseArguments } from './config.js';

describe('parseArguments --provider flag', () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    vi.resetAllMocks();
    // Minimal settings — provider flag only needs raw argv parsing
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  it('captures --provider groq into argv.provider', async () => {
    process.argv = [
      'node',
      'gemini-vesta',
      '--provider',
      'groq',
      '--prompt',
      'hi',
    ];
    const argv = await parseArguments({} as never);
    expect(argv.provider).toBe('groq');
  });

  it('provider is undefined when flag absent', async () => {
    process.argv = ['node', 'gemini-vesta', '--prompt', 'hi'];
    const argv = await parseArguments({} as never);
    expect(argv.provider).toBeUndefined();
  });

  it('does not interfere with --model flag', async () => {
    process.argv = [
      'node',
      'gemini-vesta',
      '--provider',
      'groq',
      '--model',
      'llama-3.1-70b',
    ];
    const argv = await parseArguments({} as never);
    expect(argv.provider).toBe('groq');
    expect(argv.model).toBe('llama-3.1-70b');
  });

  it('does not interfere with --prompt flag', async () => {
    process.argv = [
      'node',
      'gemini-vesta',
      '--provider',
      'deepseek',
      '--prompt',
      'explain',
    ];
    const argv = await parseArguments({} as never);
    expect(argv.provider).toBe('deepseek');
    expect(argv.prompt).toBe('explain');
  });
});
