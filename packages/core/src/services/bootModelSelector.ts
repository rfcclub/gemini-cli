/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  resolveDefaultModel,
  NoProvidersConfiguredError,
} from './defaultModelResolver.js';
import { ProviderRegistry } from './providerRegistry.js';
import { debugLogger } from '../utils/debugLogger.js';

export interface BootSelection {
  provider: string;
  model: string;
  source: string;
  /** When true, the provider was forced via --provider flag. */
  flagOverride: boolean;
}

export class UnknownProviderError extends Error {
  constructor(
    readonly requested: string,
    readonly available: string[],
  ) {
    super(
      `Unknown provider '${requested}'. Available: ${available.join(', ')}`,
    );
    this.name = 'UnknownProviderError';
  }
}

/**
 * Compute the boot model selection.
 *
 * - When `argvProvider` is set, validate it against the registry. Throw
 *   `UnknownProviderError` if not registered.
 * - Otherwise delegate to `resolveDefaultModel()`.
 * - Always emit an INFO log line with the resolved provider/model/source.
 *
 * Throws `NoProvidersConfiguredError` when no provider is available and no
 * override is given.
 */
export function selectBootModel(argvProvider?: string): BootSelection {
  const registry = ProviderRegistry.getInstance();

  // Validate --provider flag override (highest priority)
  if (argvProvider) {
    const cfg = registry.getProviderConfig(argvProvider);
    if (!cfg) {
      const available = Array.from(registry.getAllProviders().keys());
      throw new UnknownProviderError(argvProvider, available);
    }
    debugLogger.log(`INFO: --provider flag active: ${argvProvider}`);
    const models = cfg.availableModels ?? [];
    const model = models[0] ?? cfg.defaultModel ?? argvProvider;
    debugLogger.log(
      `INFO: Default model resolved: ${argvProvider}/${model} (source: flag)`,
    );
    return {
      provider: argvProvider,
      model,
      source: 'flag',
      flagOverride: true,
    };
  }

  // Delegate to resolver chain
  let resolved;
  try {
    resolved = resolveDefaultModel();
  } catch (e) {
    if (e instanceof NoProvidersConfiguredError) {
      throw e;
    }
    throw e;
  }

  debugLogger.log(
    `INFO: Default model resolved: ${resolved.provider}/${resolved.model} (source: ${resolved.source})`,
  );

  return {
    provider: resolved.provider,
    model: resolved.model,
    source: resolved.source,
    flagOverride: false,
  };
}
