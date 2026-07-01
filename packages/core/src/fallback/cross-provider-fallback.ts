/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { debugLogger } from '../utils/debugLogger.js';
import type { FailureKind } from '../availability/modelPolicy.js';
import { ProviderRegistry } from '../services/providerRegistry.js';

/**
 * A fallback candidate model with its provider info.
 */
export interface FallbackCandidate {
  /** Model ID (may include provider prefix, e.g. 'anthropic:claude-4-sonnet') */
  model: string;
  /** Provider type for logging */
  provider: string;
  /** Whether this candidate has been tried and failed */
  failed: boolean;
}

/**
 * Result of a fallback attempt.
 */
export interface FallbackResult {
  /** The model to try next, or null if all candidates exhausted */
  nextModel: string | null;
  /** Whether this is a cross-provider fallback (different provider than failed) */
  crossProvider: boolean;
  /** Human-readable reason */
  reason: string;
}

/**
 * Cross-provider fallback chain.
 *
 * When the primary model fails, this chain tries alternative models
 * from different providers in order of preference.
 *
 * Configuration via settings:
 * ```
 * {
 *   "fallbackModels": [
 *     "gemini-2.5-flash",
 *     "anthropic:claude-4-sonnet",
 *     "openai:gpt-4o"
 *   ]
 * }
 * ```
 */
export class CrossProviderFallbackChain {
  private candidates: FallbackCandidate[] = [];
  private currentIndex = 0;

  constructor(primaryModel: string) {
    this.initializeCandidates(primaryModel);
  }

  private initializeCandidates(primaryModel: string): void {
    // Add primary model
    this.candidates.push({
      model: primaryModel,
      provider: this.extractProvider(primaryModel),
      failed: false,
    });

    // Add configured fallback models
    const fallbackModels = this.getFallbackModels();
    for (const model of fallbackModels) {
      if (model !== primaryModel) {
        this.candidates.push({
          model,
          provider: this.extractProvider(model),
          failed: false,
        });
      }
    }
  }

  private getFallbackModels(): string[] {
    // Priority 1: Environment variable (explicit override)
    const envFallback = process.env['VESTA_FALLBACK_MODELS'];
    if (envFallback) {
      return envFallback.split(',').map((m) => m.trim()).filter(Boolean);
    }

    // Priority 2: Read all models from providers.yaml via ProviderRegistry
    try {
      const registry = ProviderRegistry.getInstance();
      const providers = registry.getAllProviders();
      const models: string[] = [];

      for (const [providerName, config] of providers) {
        if (config.availableModels && config.availableModels.length > 0) {
          for (const model of config.availableModels) {
            // Prefix with provider name for non-google providers
            const fullModel =
              providerName === 'gemini' ? model : `${providerName}:${model}`;
            models.push(fullModel);
          }
        } else if (config.defaultModel) {
          const fullModel =
            providerName === 'gemini'
              ? config.defaultModel
              : `${providerName}:${config.defaultModel}`;
          models.push(fullModel);
        }
      }

      if (models.length > 0) {
        debugLogger.log(
          `CrossProviderFallback: loaded ${models.length} models from providers.yaml`,
        );
        return models;
      }
    } catch (e) {
      debugLogger.warn(
        'CrossProviderFallback: failed to read providers.yaml:',
        e,
      );
    }

    // Priority 3: Default fallback chain
    return ['gemini-2.5-flash', 'gemini-2.5-pro'];
  }

  private extractProvider(model: string): string {
    if (model.includes(':')) return model.split(':')[0];
    if (model.includes('/')) model.split('/')[0];
    return 'google';
  }

  /**
   * Records that the given model has failed and returns the next candidate.
   */
  handleFailure(
    failedModel: string,
    failureKind: FailureKind,
    error?: unknown,
  ): FallbackResult {
    // Mark the failed model
    for (const candidate of this.candidates) {
      if (candidate.model === failedModel) {
        candidate.failed = true;
        break;
      }
    }

    const failedProvider = this.extractProvider(failedModel);
    debugLogger.log(
      `CrossProviderFallback: ${failedModel} (${failedProvider}) failed with ${failureKind}`,
    );

    // Find next available candidate from a different provider
    for (let i = 0; i < this.candidates.length; i++) {
      const candidate = this.candidates[i];
      if (!candidate.failed && candidate.model !== failedModel) {
        const crossProvider = candidate.provider !== failedProvider;
        this.currentIndex = i;

        debugLogger.log(
          `CrossProviderFallback: trying ${candidate.model} (${candidate.provider}), crossProvider=${crossProvider}`,
        );

        return {
          nextModel: candidate.model,
          crossProvider,
          reason: `Fallback from ${failedModel} to ${candidate.model}${crossProvider ? ' (cross-provider)' : ''}`,
        };
      }
    }

    debugLogger.log('CrossProviderFallback: all candidates exhausted');
    return {
      nextModel: null,
      crossProvider: false,
      reason: 'All fallback candidates exhausted',
    };
  }

  /**
   * Gets the current active model in the chain.
   */
  getCurrentModel(): string {
    return this.candidates[this.currentIndex]?.model ?? this.candidates[0].model;
  }

  /**
   * Resets the chain (e.g., on session start).
   */
  reset(): void {
    for (const candidate of this.candidates) {
      candidate.failed = false;
    }
    this.currentIndex = 0;
  }

  /**
   * Gets the full list of candidates for debugging.
   */
  getCandidates(): FallbackCandidate[] {
    return [...this.candidates];
  }
}

/**
 * Global fallback chain instance (per-session).
 */
let globalChain: CrossProviderFallbackChain | null = null;

export function getCrossProviderFallbackChain(
  primaryModel: string,
): CrossProviderFallbackChain {
  if (!globalChain) {
    globalChain = new CrossProviderFallbackChain(primaryModel);
  }
  return globalChain;
}

export function resetCrossProviderFallbackChain(): void {
  globalChain = null;
}
