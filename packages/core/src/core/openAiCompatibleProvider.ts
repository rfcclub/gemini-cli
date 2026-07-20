/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * File-level eslint-disable for unsafe rules in this adapter:
 *
 * The OpenAI-compatible wire format includes provider-specific extensions
 * (reasoning_content, reasoning_effort, reasoning_split, custom finish_reason
 * values, MiniMax-specific schema) and stream chunk shapes that are not
 * modeled in `@google/genai`. Per-line suppressions for every JSON.parse()
 * boundary and every message/tool_calls property access would defeat the
 * intent of these rules. Use `unknown` plus type guards only when adding
 * new code paths.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-explicit-any */

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
import { estimateTokenCountSync } from '../utils/tokenCalculation.js';

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
            : systemInstruction.parts?.map((p: Part) => p.text ?? '').join('') ?? '',
      });
    }

    const toolCallIdsByName = new Map<string, string[]>();

    for (const content of contents) {
      const role = content.role === 'user' ? 'user' : 'assistant';
      const parts = content.parts || [];

      // Check if this content is a tool response (contains functionResponse parts)
      const hasFunctionResponse = parts.some((p) => p.functionResponse);

      if (hasFunctionResponse) {
        for (const part of parts) {
          if (part.functionResponse) {
            const fnName = part.functionResponse.name || '';
            const responseData = part.functionResponse.response;

            const ids = toolCallIdsByName.get(fnName) || [];
            const toolCallId = ids.shift() || `call_${fnName}_unknown`;
            toolCallIdsByName.set(fnName, ids);

            messages.push({
              role: 'tool',
              tool_call_id: toolCallId,
              name: fnName,
              content: typeof responseData === 'string' ? responseData : JSON.stringify(responseData),
            });
          } else if (part.text) {
            messages.push({
              role: 'user',
              content: part.text,
            });
          }
        }
      } else {
        const textParts = parts.filter((p) => p.text).map((p) => p.text).join('');
        const functionCalls = parts.filter((p) => p.functionCall).map((p) => p.functionCall!);

        if (role === 'assistant') {
           
          const assistantMessage: any = {
            role: 'assistant',
            content: textParts || null,
          };

          if (functionCalls.length > 0) {
            assistantMessage.tool_calls = functionCalls.map((call) => {
              const callName = call.name || '';
              const toolCallId = `call_${callName}_${Math.random().toString(36).substring(2, 9)}`;

              const ids = toolCallIdsByName.get(callName) || [];
              ids.push(toolCallId);
              toolCallIdsByName.set(callName, ids);

              return {
                id: toolCallId,
                type: 'function',
                function: {
                  name: callName,
                  // Ensure args is always a valid JSON string; Gemini allows undefined
                  // for zero-arg functions but OpenAI APIs require a JSON object string.
                  arguments: JSON.stringify(call.args ?? {}),
                },
              };
            });
          }
          messages.push(assistantMessage);
        } else {
          messages.push({
            role: 'user',
            content: textParts,
          });
        }
      }
    }

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
      const text = message.content.replace(/<\/?think>/g, '');
      if (text) {
        parts.push({ text });
      }
    }

    if (message.reasoning_content) {
      parts.push({
        text: message.reasoning_content,
        thought: true,
         
      } as any);
    }

    const functionCalls: FunctionCall[] = [];
    if (message.tool_calls) {
      for (const call of message.tool_calls) {
        if (call.type === 'function') {
          const fnCall = {
            name: call.function.name,
            args: JSON.parse(call.function.arguments),
          } as FunctionCall;
          parts.push({
            functionCall: fnCall,
          });
          functionCalls.push(fnCall);
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
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      usageMetadata: this.computeUsageMetadata(
        request.contents as Content[],
        request.config?.systemInstruction,
        parts,
        result.usage,
      ),
    } as GenerateContentResponse;
  }

  /**
   * Builds usageMetadata with fallback estimation. OpenAI-compat providers
   * (DeepSeek, Ollama) sometimes omit or partially return `usage` data; this
   * ensures `totalTokenCount` is always a positive number so downstream cost
   * tracking has a reliable signal.
   */
  private computeUsageMetadata(
    requestContents: Content[],
    systemInstruction: unknown,
    responseParts: Part[],
    usage:
      | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
      | undefined,
  ): GenerateContentResponse['usageMetadata'] {
    const reportedInput = usage?.prompt_tokens;
    const reportedOutput = usage?.completion_tokens;

    let promptTokenCount: number;
    let candidatesTokenCount: number;

    if (typeof reportedInput === 'number' && reportedInput >= 0) {
      promptTokenCount = reportedInput;
    } else {
      // Fallback: estimate from request contents + system prompt
      const promptParts: Part[] = requestContents.flatMap((c) => c.parts ?? []);
      if (typeof systemInstruction === 'string' && systemInstruction.length > 0) {
        promptParts.push({ text: systemInstruction });
      } else if (
        systemInstruction &&
        typeof systemInstruction === 'object' &&
        Array.isArray((systemInstruction as { parts?: Part[] }).parts)
      ) {
        promptParts.push(...((systemInstruction as { parts: Part[] }).parts));
      }
      promptTokenCount = Math.max(1, estimateTokenCountSync(promptParts));
    }

    if (typeof reportedOutput === 'number' && reportedOutput >= 0) {
      candidatesTokenCount = reportedOutput;
    } else {
      candidatesTokenCount = Math.max(1, estimateTokenCountSync(responseParts));
    }

    return {
      promptTokenCount,
      candidatesTokenCount,
      totalTokenCount: promptTokenCount + candidatesTokenCount,
    };
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

    // Capture body reference before the generator so the finally block can
    // cancel it — releaseLock() alone does not close the underlying TCP
    // connection, which starves the connection pool after the first prompt.
    const responseBody = response.body;
    const reader = responseBody.getReader();
    const decoder = new TextDecoder();

    async function* streamGenerator(): AsyncGenerator<GenerateContentResponse> {
      let buffer = '';
      let isDone = false;
      const toolCallMap = new Map<number, { name: string; arguments: string }>();

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
                const text = delta.content.replace(/<\/?think>/g, '');
                if (text) {
                  parts.push({ text });
                }
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
                  const index = call.index ?? 0;
                  let activeCall = toolCallMap.get(index);
                  if (!activeCall) {
                    activeCall = { name: call.function?.name || '', arguments: '' };
                    toolCallMap.set(index, activeCall);
                  }
                  if (call.function?.name) {
                    activeCall.name = call.function.name;
                  }
                  if (call.function?.arguments) {
                    activeCall.arguments += call.function.arguments;
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
              else if (finishReason)
                // Catch-all: non-standard finish_reason values from Ollama/custom
                // providers (e.g. 'eos', 'end_turn') should be treated as STOP.
                mappedFinishReason = 'STOP';

              const chunkFunctionCalls: FunctionCall[] = [];
              if (finishReason && toolCallMap.size > 0) {
                for (const activeCall of toolCallMap.values()) {
                  const fnCall = {
                    name: activeCall.name,
                    args: activeCall.arguments
                      ? JSON.parse(activeCall.arguments)
                      : {},
                  } as FunctionCall;
                  parts.push({
                    functionCall: fnCall,
                  });
                  chunkFunctionCalls.push(fnCall);
                }
                toolCallMap.clear();
              }

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
                  functionCalls: chunkFunctionCalls.length > 0 ? chunkFunctionCalls : undefined,
                  usageMetadata: result.usage
                    ? {
                        promptTokenCount: result.usage.prompt_tokens,
                        candidatesTokenCount: result.usage.completion_tokens,
                        totalTokenCount: result.usage.total_tokens,
                      }
                    : undefined,
                } as GenerateContentResponse;
              }
            } catch {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }

        if (toolCallMap.size > 0) {
          const parts: Part[] = [];
          const chunkFunctionCalls: FunctionCall[] = [];
          for (const activeCall of toolCallMap.values()) {
            const fnCall = {
              name: activeCall.name,
              args: activeCall.arguments
                ? JSON.parse(activeCall.arguments)
                : {},
            } as FunctionCall;
            parts.push({
              functionCall: fnCall,
            });
            chunkFunctionCalls.push(fnCall);
          }
          yield {
            candidates: [
              {
                content: {
                  role: 'model',
                  parts: parts.length > 0 ? parts : undefined,
                },
                finishReason: 'STOP',
              },
            ],
            functionCalls: chunkFunctionCalls.length > 0 ? chunkFunctionCalls : undefined,
          } as GenerateContentResponse;
        }
        // If the stream ended via TCP close (done=true) without a [DONE] sentinel
        // and no pending tool calls, emit a synthetic STOP so geminiChat does not
        // throw NO_FINISH_REASON and surface an error to the user.
        if (!isDone && toolCallMap.size === 0) {
           
          yield ({
            candidates: [
              {
                content: { role: 'model', parts: [] },
                finishReason: 'STOP',
              },
            ],
          } as unknown) as GenerateContentResponse;
        }
      } finally {
        reader.releaseLock();
        // Cancel the response body to return the HTTP connection to the pool.
        // Without this, an abandoned async generator (early break, thrown error)
        // holds the connection open until the server closes it, starving the
        // pool and preventing subsequent requests from connecting.
        try {
          await responseBody.cancel();
        } catch {
          // Ignore: stream may already be fully consumed or closed.
        }
      }
    }

    return streamGenerator();
  }
}
