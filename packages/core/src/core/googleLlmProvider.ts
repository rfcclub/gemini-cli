/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GoogleGenAI,
  type GenerateContentResponse,
  type GenerateContentParameters,
} from '@google/genai';
import type { LlmProvider } from './types.js';
import type { ProviderConfig } from '../services/providerRegistry.js';
import type { LlmRole } from '../telemetry/llmRole.js';
import { ProviderFactory } from './providerFactory.js';

/**
 * Adapter for Google's Gemini API, allowing per-provider configuration.
 */
export class GoogleLlmProvider implements LlmProvider {
  private readonly client: GoogleGenAI;

  constructor(private readonly config: ProviderConfig) {
    this.client = new GoogleGenAI({
      apiKey: config.apiKey,
      // Support custom base URL for proxies/gateways
      httpOptions: config.baseUrl ? { baseUrl: config.baseUrl } : undefined,
    });
  }

  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
    _role: LlmRole,
  ): Promise<GenerateContentResponse> {
    const modelId = ProviderFactory.stripPrefix(request.model || this.config.defaultModel || 'gemini-1.5-flash');
    const result = await this.client.models.generateContent({
        model: modelId,
        contents: request.contents as any,
        config: request.config as any,
    });

    return result;
  }

  async generateContentStream(
    _request: GenerateContentParameters,
    _userPromptId: string,
    _role: LlmRole,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    throw new Error('Streaming not yet implemented for GoogleLlmProvider');
  }
}
