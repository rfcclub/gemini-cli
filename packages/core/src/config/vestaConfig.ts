/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Storage } from './storage.js';
import { parseYaml } from '../utils/yaml.js';
import { debugLogger } from '../utils/debugLogger.js';

/**
 * Vesta user config schema, sourced from `~/.gemini-vesta/config.yaml`.
 * All fields are optional — missing fields fall back to lower-priority sources
 * (env override → catalog → fallback).
 */
export interface VestaConfig {
  /** Provider/model string in the form "provider/model". */
  defaultModel?: string;
  /** Provider name (e.g., "groq", "deepseek"). */
  defaultProvider?: string;
  /** Optional opt-in Gemini API key. Only consumed when env GEMINI_API_KEY is unset. */
  geminiApiKey?: string;
}

/**
 * Typed error raised when `~/.gemini-vesta/config.yaml` exists but cannot be
 * parsed. The original YAML parser error is preserved on `cause` for diagnostics.
 */
export class VestaConfigParseError extends Error {
  constructor(message: string, cause?: unknown) {
    super(`Failed to parse config.yaml: ${message}`);
    this.name = 'VestaConfigParseError';
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

/**
 * Load `~/.gemini-vesta/config.yaml` from the Vesta home directory.
 *
 * - Returns `null` when the file does not exist (NOT an error).
 * - Returns a parsed `VestaConfig` on success.
 * - Throws `VestaConfigParseError` on malformed YAML.
 * - Emits a warning when the file contains `geminiApiKey` and permissions
 *   are not `0600`.
 */
export function loadVestaConfig(): VestaConfig | null {
  const globalDir = Storage.getGlobalGeminiDir();
  const configPath = path.join(globalDir, 'config.yaml');

  if (!fs.existsSync(configPath)) {
    return null;
  }

  const content = fs.readFileSync(configPath, 'utf8');
  let parsed: VestaConfig | null;
  try {
    parsed = (parseYaml<VestaConfig>(content) ?? null) as VestaConfig | null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new VestaConfigParseError(msg, e);
  }

  const stat = fs.statSync(configPath);
  const mode = stat.mode & 0o777;
  if (parsed?.geminiApiKey && mode !== 0o600) {
    const octal = mode.toString(8).padStart(4, '0');
    debugLogger.warn(
      `WARN: config.yaml contains API key but permissions are ${octal}. Run: chmod 600 ~/.gemini-vesta/config.yaml`,
    );
  }

  return parsed;
}
