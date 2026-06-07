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
 * Adapter for Anthropic's Messages API (Claude).
 */
export class AnthropicProvider implements LlmProvider {
  constructor(private readonly config: ProviderConfig) {}

  async generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
    role: LlmRole,
  ): Promise<GenerateContentResponse> {
    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1';
    const apiKey = this.config.apiKey;
    const rawModel = request.model || this.config.defaultModel;

    if (!rawModel) {
      throw new Error('Model not specified for Anthropic provider');
    }

    const model = ProviderFactory.stripPrefix(rawModel);

    const contents = request.contents as Content[];

    // Map Gemini request to Anthropic request
    const messages = contents.map((content) => ({
      role: content.role === 'user' ? 'user' : 'assistant',
      content: content.parts?.map((p: Part) => {
        if (p.text) return { type: 'text', text: p.text };
        if (p.functionCall) {
            return {
                type: 'tool_use',
                id: `tool_${Math.random().toString(36).substring(7)}`,
                name: p.functionCall.name,
                input: p.functionCall.args,
            };
        }
        return { type: 'text', text: '' };
      }),
    }));

    // Map tools
    const tools = (request.config?.tools as Tool[] | undefined)?.flatMap((t) => 
      t.functionDeclarations?.map((f) => ({
        name: f.name,
        description: f.description,
        input_schema: f.parameters,
      }))
    );

    const body: any = {
      model,
      messages,
      max_tokens: 4096,
      stream: false,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    debugLogger.log(`Calling Anthropic API at ${baseUrl}/messages`);

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || '',
        'anthropic-version': '2023-06-01',
        ...this.config.customHeaders,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    
    const parts: Part[] = [];
    for (const block of result.content) {
      if (block.type === 'text') {
        parts.push({ text: block.text });
      } else if (block.type === 'tool_use') {
        parts.push({
          functionCall: {
            name: block.name,
            args: block.input,
          } as FunctionCall,
        });
      }
    }

    return {
      candidates: [
        {
          content: {
            role: 'model',
            parts,
          },
          finishReason: result.stop_reason === 'tool_use' ? 'STOP' : 'STOP',
        },
      ],
      usageMetadata: {
        promptTokenCount: result.usage?.input_tokens,
        candidatesTokenCount: result.usage?.output_tokens,
        totalTokenCount: (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0),
      },
    } as GenerateContentResponse;
  }

  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
    _role: LlmRole,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1';
    const apiKey = this.config.apiKey;
    const rawModel = request.model || this.config.defaultModel;

    if (!rawModel) {
      throw new Error('Model not specified for Anthropic provider');
    }

    const model = ProviderFactory.stripPrefix(rawModel);
    const contents = request.contents as Content[];

    // Map Gemini request to Anthropic request
    const messages = contents.map((content) => ({
      role: content.role === 'user' ? 'user' : 'assistant',
      content: content.parts?.map((p: Part) => {
        if (p.text) return { type: 'text', text: p.text };
        if (p.functionCall) {
          return {
            type: 'tool_use',
            id: `tool_${Math.random().toString(36).substring(7)}`,
            name: p.functionCall.name,
            input: p.functionCall.args,
          };
        }
        return { type: 'text', text: '' };
      }),
    }));

    // Map tools
    const tools = (request.config?.tools as Tool[] | undefined)?.flatMap((t) =>
      t.functionDeclarations?.map((f) => ({
        name: f.name,
        description: f.description,
        input_schema: f.parameters,
      })),
    );

    const body: any = {
      model,
      messages,
      max_tokens: 4096,
      stream: true,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    debugLogger.log(`Calling Anthropic API (stream) at ${baseUrl}/messages`);

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || '',
        'anthropic-version': '2023-06-01',
        ...this.config.customHeaders,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body for Anthropic stream');
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
            if (!trimmedLine) continue;

            if (trimmedLine.startsWith('event: ')) {
              continue;
            }

            if (trimmedLine.startsWith('data: ')) {
              const data = trimmedLine.substring(6);
              try {
                const result = JSON.parse(data);

                const parts: Part[] = [];
                let finishReason: any;
                let usageMetadata: any;

                switch (result.type) {
                  case 'content_block_delta':
                    if (result.delta?.type === 'text_delta') {
                      parts.push({ text: result.delta.text });
                    }
                    break;
                  case 'message_delta':
                    if (result.delta?.stop_reason) {
                      const reason = result.delta.stop_reason;
                      if (reason === 'end_turn') finishReason = 'STOP';
                      else if (reason === 'max_tokens')
                        finishReason = 'MAX_TOKENS';
                      else if (reason === 'stop_sequence') finishReason = 'STOP';
                      else if (reason === 'tool_use') finishReason = 'STOP';
                    }
                    if (result.usage) {
                      usageMetadata = {
                        candidatesTokenCount: result.usage.output_tokens,
                      };
                    }
                    break;
                  case 'message_start':
                    if (result.message?.usage) {
                      usageMetadata = {
                        promptTokenCount: result.message.usage.input_tokens,
                      };
                    }
                    break;
                  case 'message_stop':
                    isDone = true;
                    break;
                }

                if (parts.length > 0 || finishReason || usageMetadata) {
                  yield {
                    candidates: [
                      {
                        content: {
                          role: 'model',
                          parts: parts.length > 0 ? parts : undefined,
                        },
                        finishReason,
                      },
                    ],
                    usageMetadata,
                  } as GenerateContentResponse;
                }
              } catch (e) {
                debugLogger.error(`Error parsing Anthropic stream chunk: ${e}`);
              }
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
