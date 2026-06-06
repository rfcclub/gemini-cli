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

/**
 * Adapter for OpenAI-compatible APIs (DeepSeek, Groq, Ollama, etc.).
 */
export class OpenAiCompatibleProvider implements LlmProvider {
  constructor(private readonly config: ProviderConfig) {}

  async generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
    role: LlmRole,
  ): Promise<GenerateContentResponse> {
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
    const apiKey = this.config.apiKey;
    const rawModel = request.model || this.config.defaultModel;
    
    if (!rawModel) {
      throw new Error('Model not specified for OpenAI-compatible provider');
    }

    const model = ProviderFactory.stripPrefix(rawModel);

    const contents = request.contents as Content[];

    // Map Gemini request to OpenAI request
    const messages = contents.map((content) => ({
      role: content.role === 'user' ? 'user' : 'assistant',
      content: content.parts?.map((p: Part) => p.text).join('') ?? '',
    }));

    // Map tools
    const tools = (request.config?.tools as Tool[] | undefined)?.flatMap((t) => 
      t.functionDeclarations?.map((f) => ({
        type: 'function',
        function: {
          name: f.name,
          description: f.description,
          parameters: f.parameters,
        },
      }))
    );

    const body: any = {
      model,
      messages,
      stream: false,
      ...request.config,
    };

    // Remove tools if empty or not supported in a way that OpenAI expects
    if (tools && tools.length > 0) {
      body.tools = tools;
    } else {
      delete body.tools;
    }

    // Clean up Gemini-specific config fields that shouldn't go to OpenAI
    delete body.systemInstruction;
    delete body.abortSignal;

    debugLogger.log(`Calling OpenAI-compatible API at ${baseUrl}/chat/completions`);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        ...this.config.customHeaders,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const choice = result.choices[0];
    const message = choice.message;

    const parts: Part[] = [];
    if (message.content) {
      parts.push({ text: message.content });
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

    // Map OpenAI response back to Gemini response
    return {
      candidates: [
        {
          content: {
            role: 'model',
            parts,
          },
          finishReason: choice.finish_reason === 'tool_calls' ? 'STOP' : 'STOP',
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
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
    const apiKey = this.config.apiKey;
    const rawModel = request.model || this.config.defaultModel;

    if (!rawModel) {
      throw new Error('Model not specified for OpenAI-compatible provider');
    }

    const model = ProviderFactory.stripPrefix(rawModel);
    const contents = request.contents as Content[];

    // Map Gemini request to OpenAI request
    const messages = contents.map((content) => ({
      role: content.role === 'user' ? 'user' : 'assistant',
      content: content.parts?.map((p: Part) => p.text).join('') ?? '',
    }));

    // Map tools
    const tools = (request.config?.tools as Tool[] | undefined)?.flatMap((t) =>
      t.functionDeclarations?.map((f) => ({
        type: 'function',
        function: {
          name: f.name,
          description: f.description,
          parameters: f.parameters,
        },
      })),
    );

    const body: any = {
      model,
      messages,
      stream: true,
      ...request.config,
    };

    // Remove tools if empty or not supported in a way that OpenAI expects
    if (tools && tools.length > 0) {
      body.tools = tools;
    } else {
      delete body.tools;
    }

    // Clean up Gemini-specific config fields that shouldn't go to OpenAI
    delete body.systemInstruction;
    delete body.abortSignal;

    debugLogger.log(
      `Calling OpenAI-compatible API (stream) at ${baseUrl}/chat/completions`,
    );

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        ...this.config.customHeaders,
      },
      body: JSON.stringify(body),
    });

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
              else if (finishReason === 'length') mappedFinishReason = 'MAX_TOKENS';
              else if (finishReason === 'content_filter')
                mappedFinishReason = 'SAFETY';
              else if (finishReason === 'tool_calls') mappedFinishReason = 'STOP';

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
              debugLogger.error(`Error parsing OpenAI stream chunk: ${e}`);
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
