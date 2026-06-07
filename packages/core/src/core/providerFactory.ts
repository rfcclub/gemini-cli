/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LlmProvider } from './types.js';
import {
  ProviderRegistry,
  type ProviderConfig,
} from '../services/providerRegistry.js';
import { OpenAiCompatibleProvider } from './openAiCompatibleProvider.js';
import { AnthropicProvider } from './anthropicProvider.js';
import { GoogleLlmProvider } from './googleLlmProvider.js';

/**
 * Factory for instantiating LLM providers based on model ID prefixes or explicit config.
 */
export class ProviderFactory {
  static getProvider(modelId: string): LlmProvider | undefined {
    const registry = ProviderRegistry.getInstance();

    // Check for colon first (preferred)
    const colonIndex = modelId.indexOf(':');
    if (colonIndex !== -1) {
      const providerName = modelId.substring(0, colonIndex);
      const config = registry.getProviderConfig(providerName);
      if (config) {
        return this.createProvider(config);
      }
    }

    // Check for slash (common in some ecosystems like OpenRouter)
    const slashIndex = modelId.indexOf('/');
    if (slashIndex !== -1) {
      const providerName = modelId.substring(0, slashIndex);
      const config = registry.getProviderConfig(providerName);
      if (config) {
        return this.createProvider(config);
      }
    }

    return undefined;
  }

  private static createProvider(config: ProviderConfig): LlmProvider | undefined {
    switch (config.type) {
      case 'openai-compatible':
        return new OpenAiCompatibleProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'google':
        return new GoogleLlmProvider(config);
      default:
        return undefined;
    }
  }

  /**
   * Helper to strip the provider prefix from a model ID.
   */
  static stripPrefix(modelId: string): string {
    const registry = ProviderRegistry.getInstance();

    const colonIndex = modelId.indexOf(':');
    if (
      colonIndex !== -1 &&
      registry.getProviderConfig(modelId.substring(0, colonIndex))
    ) {
      return modelId.substring(colonIndex + 1);
    }

    const slashIndex = modelId.indexOf('/');
    if (
      slashIndex !== -1 &&
      registry.getProviderConfig(modelId.substring(0, slashIndex))
    ) {
      return modelId.substring(slashIndex + 1);
    }

    return modelId;
  }
}
