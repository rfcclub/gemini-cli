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
        debugLogger.log(`Loaded providers from ${providersPath}:`, Object.keys(settings?.providers || {}));
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
  }

  clear(): void {
    this.providers.clear();
  }
}
