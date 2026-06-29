/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { loadVestaConfig } from '../config/vestaConfig.js';
import { ProviderRegistry } from './providerRegistry.js';
import { debugLogger } from '../utils/debugLogger.js';

/**
 * Source of the resolved default model, in priority order:
 * `env` > `config` > `catalog` > `fallback` > `gemini-default`.
 *
 * Tagged on every `ResolvedModel` so the CLI can log which tier answered.
 */
export type ResolutionSource =
  | 'env'
  | 'config'
  | 'catalog'
  | 'fallback'
  | 'gemini-default';

export interface ResolvedModel {
  provider: string;
  model: string;
  source: ResolutionSource;
}

/**
 * Raised when no provider is registered AND no override is set.
 * The CLI catches this and prints a recovery message before exiting.
 */
export class NoProvidersConfiguredError extends Error {
  constructor() {
    super(
      'No providers configured. Run `vesta init-providers` or set GEMINI_API_KEY.',
    );
    this.name = 'NoProvidersConfiguredError';
  }
}

/**
 * Parse a "provider/model" string. Returns null if the input is malformed
 * (missing slash, empty parts).
 */
function parseProviderModel(value: string | undefined): {
  provider: string;
  model: string;
} | null {
  if (!value) return null;
  const idx = value.indexOf('/');
  if (idx <= 0 || idx === value.length - 1) return null;
  return {
    provider: value.slice(0, idx),
    model: value.slice(idx + 1),
  };
}

/**
 * Resolve the default model using the 4-tier priority chain.
 *
 * 1. `VESTA_DEFAULT_MODEL` env var (highest priority).
 * 2. `~/.gemini-vesta/config.yaml.defaultModel`.
 * 3. First registered provider's first `availableModels` entry (source: catalog).
 * 4. Fallback warning + first provider's first model — emitted when only one
 *    provider is registered (no real choice) and no config exists.
 *
 * Throws `NoProvidersConfiguredError` when no provider is available.
 */
export function resolveDefaultModel(): ResolvedModel {
  // Tier 1: env override
  const envValue = process.env['VESTA_DEFAULT_MODEL'];
  const envParsed = parseProviderModel(envValue);
  if (envParsed) {
    return { ...envParsed, source: 'env' };
  }

  // Tier 2: config.yaml
  const config = loadVestaConfig();
  const configParsed = parseProviderModel(config?.defaultModel);
  if (configParsed) {
    return { ...configParsed, source: 'config' };
  }

  // Tier 3 + 4: catalog (with fallback warning when only one provider + no config)
  const registry = ProviderRegistry.getInstance();
  const providers = registry.getAllProviders();
  if (providers.size === 0) {
    throw new NoProvidersConfiguredError();
  }

  // First provider in catalog order (Map preserves insertion order).
  // Note: providers.size > 0 is guaranteed by check above.
  const firstEntry = providers.entries().next().value;
  if (!firstEntry) {
    throw new NoProvidersConfiguredError();
  }
  const [firstProviderName, firstProviderConfig] = firstEntry as [
    string,
    { availableModels?: string[] },
  ];

  const models = firstProviderConfig.availableModels ?? [];
  if (models.length === 0) {
    throw new NoProvidersConfiguredError();
  }

  const firstModel = models[0];

  // Source semantics:
  // - 'catalog': multiple providers available, using providers[0] as default.
  // - 'fallback': only one provider available (no real choice) AND no
  //   config.yaml — user is warned so they know selection was implicit.
  const source: ResolutionSource = providers.size > 1 ? 'catalog' : 'fallback';

  if (source === 'fallback') {
    debugLogger.warn(
      `WARN: No config.yaml found. Auto-selected ${firstProviderName}/${firstModel} from providers.yaml.`,
    );
  }

  return {
    provider: firstProviderName,
    model: firstModel,
    source,
  };
}
