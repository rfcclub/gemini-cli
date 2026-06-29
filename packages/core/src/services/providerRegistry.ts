/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Storage } from '../config/storage.js';
import { parseYaml } from '../utils/yaml.js';
import { debugLogger } from '../utils/debugLogger.js';
import { expandEnvVars } from '../utils/envExpansion.js';

export interface ProviderConfig {
  type: 'openai-compatible' | 'anthropic' | 'google';
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  customHeaders?: Record<string, string>;
  /**
   * Optional catalog of model IDs that the provider exposes.
   * Sourced from providers.yaml; consumer code (e.g. /model command,
   * ModelConfigService) may surface these to the user.
   * Order matches the YAML declaration.
   */
  availableModels?: string[];
  /**
   * Optional curated subset of `availableModels` to surface in user-facing
   * pickers (e.g. the `/model` command). When set AND non-empty, the
   * provider registry exposes ONLY these models to ModelConfigService,
   * regardless of how many entries `availableModels` has. This lets users
   * curate a small, opinionated set per vendor without losing the full
   * catalog for boot/routing logic.
   *
   * If unset or empty, the picker falls back to `availableModels` (or
   * `defaultModel` if `availableModels` is also empty).
   *
   * Order matches the YAML declaration.
   */
  featuredModels?: string[];
}

export interface ProviderSettings {
  providers: Record<string, ProviderConfig>;
}

/**
 * Registry for managing external LLM provider configurations.
 * Loads and stores configurations from providers.yaml.
 */
export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, ProviderConfig> = new Map();

  private constructor() {}

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  registerProvider(name: string, config: ProviderConfig): void {
    this.providers.set(name, config);
  }

  getProviderConfig(name: string): ProviderConfig | undefined {
    return this.providers.get(name);
  }

  getAllProviders(): Map<string, ProviderConfig> {
    return new Map(this.providers);
  }

  async loadFromGlobalConfig(): Promise<void> {
    const globalDir = Storage.getGlobalGeminiDir();
    const providersPath = path.join(globalDir, 'providers.yaml');

    if (fs.existsSync(providersPath)) {
      try {
        const content = fs.readFileSync(providersPath, 'utf8');
        const settings = parseYaml<ProviderSettings>(content);
        debugLogger.log(
          `Loaded providers from ${providersPath}:`,
          Object.keys(settings?.providers || {}),
        );
        if (settings && settings.providers) {
          for (const [name, config] of Object.entries(settings.providers)) {
            const expandedConfig: ProviderConfig = {
              ...config,
              apiKey: config.apiKey
                ? expandEnvVars(config.apiKey, process.env)
                : undefined,
              baseUrl: config.baseUrl
                ? expandEnvVars(config.baseUrl, process.env)
                : undefined,
            };
            this.registerProvider(name, expandedConfig);
            debugLogger.log(`Registered provider: ${name}`);
          }
        }
      } catch (e) {
        debugLogger.error(`Failed to load providers.yaml: ${e}`);
      }
    }

    // Opt-in Gemini registration: only register when GEMINI_API_KEY is set
    // to a non-empty string. This makes providers.yaml the sovereign source
    // of truth and demotes Gemini from forced-default to optional provider.
    const geminiKey = process.env['GEMINI_API_KEY'];
    if (geminiKey && geminiKey.length > 0) {
      this.registerProvider('gemini', {
        type: 'google',
        apiKey: geminiKey,
        defaultModel: 'gemini-2.5-pro',
      });
      debugLogger.log(
        'Registered provider: gemini (opt-in via GEMINI_API_KEY)',
      );
    }
  }

  clear(): void {
    this.providers.clear();
  }
}
