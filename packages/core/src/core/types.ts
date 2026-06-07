/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  GenerateContentResponse,
  GenerateContentParameters,
} from '@google/genai';
import type { LlmRole } from '../telemetry/llmRole.js';

/**
 * Interface defining the standard operations for an LLM provider.
 * This abstracts away the specific transport layer (Google GenAI, OpenAI, Anthropic).
 */
export interface LlmProvider {
  /**
   * Generates content based on the provided request parameters.
   */
  generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
    role: LlmRole,
  ): Promise<GenerateContentResponse>;

  /**
   * Generates a stream of content chunks.
   */
  generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
    role: LlmRole,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  /**
   * (Optional) Returns the raw underlying client if needed for specific operations.
   */
  readonly rawClient?: any;
}
