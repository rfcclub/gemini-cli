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
    const model = request.model || this.config.defaultModel;
    if (!model) {
      throw new Error('No model specified for GoogleLlmProvider');
    }
    const modelId = ProviderFactory.stripPrefix(model);
    const result = await this.client.models.generateContent({
        model: modelId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-unsafe-assignment
        contents: request.contents as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-unsafe-assignment
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
