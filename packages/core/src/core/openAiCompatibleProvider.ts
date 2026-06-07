/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  GenerateContentResponse,
  GenerateContentParameters,
  FunctionCall,
  Content,
  Part,
  Tool,
} from '@google/genai';
import type { LlmProvider } from './types.js';
import type { ProviderConfig } from '../services/providerRegistry.js';
import type { LlmRole } from '../telemetry/llmRole.js';
import { debugLogger } from '../utils/debugLogger.js';
import { ProviderFactory } from './providerFactory.js';

export class OpenAiCompatibleProvider implements LlmProvider {
  constructor(private readonly config: ProviderConfig) {}

  private getModelName(rawModel?: string): string {
    const modelId = rawModel || this.config.defaultModel;
    if (!modelId) {
      throw new Error('Model not specified for OpenAI-compatible provider');
    }
    return ProviderFactory.stripPrefix(modelId);
  }

  private mapMessages(contents: Content[], systemInstruction?: any): any[] {
    const messages: any[] = [];

    if (systemInstruction) {
      messages.push({
        role: 'system',
        content:
          typeof systemInstruction === 'string'
            ? systemInstruction
            : systemInstruction.parts?.map((p: any) => p.text).join('') ?? '',
      });
    }

    messages.push(
      ...contents.map((content) => ({
        role: content.role === 'user' ? 'user' : 'assistant',
        content: content.parts?.map((p: Part) => p.text).join('') ?? '',
      })),
    );

    return messages;
  }

  /**
   * Recursively normalizes parameter schemas for OpenAI compatibility.
   * Converts types to lowercase and handles differences in format.
   */
  private normalizeSchema(schema: any): any {
    if (!schema || typeof schema !== 'object') return schema;

    const normalized: any = { ...schema };

    if (typeof normalized.type === 'string') {
      normalized.type = normalized.type.toLowerCase();
    }

    if (normalized.properties) {
      const newProperties: any = {};
      for (const [key, value] of Object.entries(normalized.properties)) {
        newProperties[key] = this.normalizeSchema(value);
      }
      normalized.properties = newProperties;
    }

    if (normalized.items) {
      normalized.items = this.normalizeSchema(normalized.items);
    }

    return normalized;
  }

  private mapTools(requestTools?: Tool[]): any[] | undefined {
    const tools = requestTools?.flatMap((t) =>
      t.functionDeclarations?.map((f) => {
        // Use either parameters or parametersJsonSchema (legacy)
        const rawParameters = f.parameters || (f as any).parametersJsonSchema;
        const normalizedParameters = rawParameters 
          ? this.normalizeSchema(rawParameters)
          : { type: 'object', properties: {} };

        return {
          type: 'function',
          function: {
            name: f.name,
            description: f.description || '',
            parameters: normalizedParameters,
          },
        };
      }),
    );

    return tools && tools.length > 0 ? tools : undefined;
  }

  private createRequestBody(
    request: GenerateContentParameters,
    model: string,
    messages: any[],
    stream: boolean,
  ): any {
    const tools = this.mapTools(request.config?.tools as Tool[] | undefined);

    const body: any = {
      model,
      messages,
      stream,
      temperature: request.config?.temperature,
      top_p: request.config?.topP,
      max_tokens: request.config?.maxOutputTokens,
      stop:
        request.config?.stopSequences && request.config.stopSequences.length > 0
          ? request.config.stopSequences
          : undefined,
      presence_penalty: request.config?.presencePenalty,
      frequency_penalty: request.config?.frequencyPenalty,
      reasoning_effort: (request.config as any)?.reasoningEffort,
      ...(tools && { tools }),
    };

    // Special handling for MiniMax reasoning models
    if (model.includes('MiniMax-M3')) {
      body.reasoning_split = true;
    }

    return body;
  }

  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
    _role: LlmRole,
  ): Promise<GenerateContentResponse> {
    const baseUrl = (this.config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const apiKey = this.config.apiKey;
    const model = this.getModelName(request.model);
    const messages = this.mapMessages(
      request.contents as Content[],
      request.config?.systemInstruction,
    );
    const body = this.createRequestBody(request, model, messages, false);

    const url = `${baseUrl}/chat/completions`;
    debugLogger.log(
      `Calling OpenAI-compatible API at ${url}`,
    );

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
          ...this.config.customHeaders,
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new Error(`Failed to contact OpenAI-compatible API at ${url}: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const choice = result.choices[0];
    if (!choice) {
      throw new Error('No choice in OpenAI response');
    }
    const message = choice.message;

    const parts: Part[] = [];
    if (message.content) {
      parts.push({ text: message.content });
    }

    if (message.reasoning_content) {
      parts.push({
        text: message.reasoning_content,
        thought: true,
      } as any);
    }

    if (message.tool_calls) {
      for (const call of message.tool_calls) {
        if (call.type === 'function') {
          parts.push({
            functionCall: {
              name: call.function.name,
              args: JSON.parse(call.function.arguments),
            } as FunctionCall,
          });
        }
      }
    }

    return {
      candidates: [
        {
          content: {
            role: 'model',
            parts,
          },
          finishReason: choice.finish_reason === 'stop' ? 'STOP' : 'STOP',
        },
      ],
      usageMetadata: {
        promptTokenCount: result.usage?.prompt_tokens,
        candidatesTokenCount: result.usage?.completion_tokens,
        totalTokenCount: result.usage?.total_tokens,
      },
    } as GenerateContentResponse;
  }

  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
    _role: LlmRole,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const baseUrl = (this.config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const apiKey = this.config.apiKey;
    const model = this.getModelName(request.model);
    const messages = this.mapMessages(
      request.contents as Content[],
      request.config?.systemInstruction,
    );
    const body = this.createRequestBody(request, model, messages, true);

    const url = `${baseUrl}/chat/completions`;
    debugLogger.log(
      `Calling OpenAI-compatible API (stream) at ${url}`,
    );

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
          ...this.config.customHeaders,
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new Error(`Failed to contact OpenAI-compatible API at ${url}: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body for OpenAI-compatible stream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    async function* streamGenerator(): AsyncGenerator<GenerateContentResponse> {
      let buffer = '';
      let isDone = false;
      try {
        while (!isDone) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

            const data = trimmedLine.substring(6);
            if (data === '[DONE]') {
              isDone = true;
              break;
            }

            try {
              const result = JSON.parse(data);
              const choice = result.choices[0];
              if (!choice) continue;

              const delta = choice.delta;
              const finishReason = choice.finish_reason;

              const parts: Part[] = [];
              if (delta?.content) {
                parts.push({ text: delta.content });
              }

              if (delta?.reasoning_content) {
                // Map OpenAI-style reasoning content to Gemini thought parts
                parts.push({
                  text: delta.reasoning_content,
                  thought: true,
                } as any);
              }

              if (delta?.tool_calls) {
                for (const call of delta.tool_calls) {
                  if (call.type === 'function') {
                    parts.push({
                      functionCall: {
                        name: call.function.name,
                        args: call.function.arguments
                          ? JSON.parse(call.function.arguments)
                          : {},
                      } as FunctionCall,
                    });
                  }
                }
              }

              let mappedFinishReason: any;
              if (finishReason === 'stop') mappedFinishReason = 'STOP';
              else if (finishReason === 'length')
                mappedFinishReason = 'MAX_TOKENS';
              else if (finishReason === 'content_filter')
                mappedFinishReason = 'SAFETY';
              else if (finishReason === 'tool_calls')
                mappedFinishReason = 'STOP';

              if (parts.length > 0 || mappedFinishReason || result.usage) {
                yield {
                  candidates: [
                    {
                      content: {
                        role: 'model',
                        parts: parts.length > 0 ? parts : undefined,
                      },
                      finishReason: mappedFinishReason,
                    },
                  ],
                  usageMetadata: result.usage
                    ? {
                        promptTokenCount: result.usage.prompt_tokens,
                        candidatesTokenCount: result.usage.completion_tokens,
                        totalTokenCount: result.usage.total_tokens,
                      }
                    : undefined,
                } as GenerateContentResponse;
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }

    return streamGenerator();
  }
}
