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
import { estimateTokenCountSync } from '../utils/tokenCalculation.js';

/**
 * Adapter for Anthropic's Messages API (Claude).
 */
export class AnthropicProvider implements LlmProvider {
  constructor(private readonly config: ProviderConfig) {}

  /**
   * Converts Gemini's systemInstruction shape (string | Content | undefined)
   * into a plain string suitable for Anthropic's top-level `system` field.
   * Returns undefined when there is no usable text so the caller can omit
   * the field entirely (Anthropic rejects empty strings).
   */
  private extractSystemText(systemInstruction: unknown): string | undefined {
    if (!systemInstruction) return undefined;
    if (typeof systemInstruction === 'string') {
      const trimmed = systemInstruction.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    if (typeof systemInstruction === 'object') {
      const parts = (systemInstruction as { parts?: Part[] }).parts;
      if (Array.isArray(parts)) {
        const text = parts
          .map((p) => (typeof p?.text === 'string' ? p.text : ''))
          .join('')
          .trim();
        return text.length > 0 ? text : undefined;
      }
    }
    return undefined;
  }

  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
    _role: LlmRole,
  ): Promise<GenerateContentResponse> {
    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1';
    const apiKey = this.config.apiKey;
    const rawModel = request.model || this.config.defaultModel;

    if (!rawModel) {
      throw new Error('Model not specified for Anthropic provider');
    }

    const model = ProviderFactory.stripPrefix(rawModel);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const contents = request.contents as Content[];
    const systemText = this.extractSystemText(request.config?.systemInstruction);

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const tools = (request.config?.tools as Tool[] | undefined)?.flatMap((t) => 
      t.functionDeclarations?.map((f) => ({
        name: f.name,
        description: f.description,
        input_schema: f.parameters,
      }))
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
      model,
      messages,
      max_tokens: 4096,
      stream: false,
    };

    if (systemText !== undefined) {
      body.system = systemText;
    }

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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await response.json();
    
    const parts: Part[] = [];
    const functionCalls: FunctionCall[] = [];
     
    for (const block of result.content) {
       
      if (block.type === 'text') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        parts.push({ text: block.text });
      } else if (block.type === 'tool_use') {
         
        const fnCall = {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          name: block.name,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          args: block.input,
           
        } as FunctionCall;
        parts.push({
          functionCall: fnCall,
        });
        functionCalls.push(fnCall);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
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
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      usageMetadata: this.computeUsageMetadata(
        contents,
        systemText,
        parts,
         
        result.usage,
      ),
    } as GenerateContentResponse;
  }

  /**
   * Builds usageMetadata with fallback estimation when the provider omits or
   * partially returns usage. Guarantees `totalTokenCount` is a positive number.
   */
  private computeUsageMetadata(
    requestContents: Content[],
    systemText: string | undefined,
    responseParts: Part[],
    usage: { input_tokens?: number; output_tokens?: number } | undefined,
  ): GenerateContentResponse['usageMetadata'] {
    const reportedInput = usage?.input_tokens;
    const reportedOutput = usage?.output_tokens;

    let promptTokenCount: number;
    let candidatesTokenCount: number;

    if (typeof reportedInput === 'number' && reportedInput >= 0) {
      promptTokenCount = reportedInput;
    } else {
      // Fallback: estimate from request contents + system prompt
      const promptParts: Part[] = requestContents.flatMap((c) => c.parts ?? []);
      if (systemText) {
        promptParts.push({ text: systemText });
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
    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1';
    const apiKey = this.config.apiKey;
    const rawModel = request.model || this.config.defaultModel;

    if (!rawModel) {
      throw new Error('Model not specified for Anthropic provider');
    }

    const model = ProviderFactory.stripPrefix(rawModel);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const contents = request.contents as Content[];
    const systemText = this.extractSystemText(request.config?.systemInstruction);

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const tools = (request.config?.tools as Tool[] | undefined)?.flatMap((t) =>
      t.functionDeclarations?.map((f) => ({
        name: f.name,
        description: f.description,
        input_schema: f.parameters,
      })),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
      model,
      messages,
      max_tokens: 4096,
      stream: true,
    };

    if (systemText !== undefined) {
      body.system = systemText;
    }

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
      // Accumulate token usage across streaming chunks.
      // Anthropic sends prompt tokens in message_start and output tokens in message_delta.
      let accumulatedPromptTokens: number | undefined;
      let accumulatedOutputTokens: number | undefined;

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
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const result = JSON.parse(data);

                const parts: Part[] = [];
                let finishReason: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | undefined;
                let usageMetadata:
                  | {
                      promptTokenCount: number;
                      candidatesTokenCount: number;
                      totalTokenCount: number;
                    }
                  | undefined;

                switch (result.type) {
                  case 'content_block_start':
                     
                    if (result.content_block?.type === 'tool_use') {
                      toolCallMap.set(result.index, {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        name: result.content_block.name,
                        arguments: '',
                      });
                    }
                    break;
                  case 'content_block_delta':
                     
                    if (result.delta?.type === 'text_delta') {
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                      parts.push({ text: result.delta.text });
                     
                    } else if (result.delta?.type === 'input_json_delta') {
                       
                      const activeCall = toolCallMap.get(result.index);
                      if (activeCall) {
                         
                        activeCall.arguments += result.delta.partial_json;
                      }
                    }
                    break;
                  case 'content_block_stop':
                    {
                       
                      const activeCall = toolCallMap.get(result.index);
                      if (activeCall) {
                        parts.push({
                          functionCall: {
                            name: activeCall.name,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            args: activeCall.arguments ? JSON.parse(activeCall.arguments) : {},
                          } as FunctionCall,
                        });
                         
                        toolCallMap.delete(result.index);
                      }
                    }
                    break;
                  case 'message_delta':
                     
                    if (result.delta?.stop_reason) {
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                      const reason = result.delta.stop_reason;
                      if (reason === 'end_turn') finishReason = 'STOP';
                      else if (reason === 'max_tokens')
                        finishReason = 'MAX_TOKENS';
                      else if (reason === 'stop_sequence') finishReason = 'STOP';
                      else if (reason === 'tool_use') finishReason = 'STOP';
                    }
                     
                    if (result.usage) {
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                      accumulatedOutputTokens = result.usage.output_tokens;
                    }
                    break;
                  case 'message_start':
                     
                    if (result.message?.usage) {
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                      accumulatedPromptTokens = result.message.usage.input_tokens;
                    }
                    break;
                  case 'message_stop':
                    isDone = true;
                    break;
                  default:
                    break;
                }

                // Build usage metadata from accumulated values.
                // Always include totalTokenCount when both values are known.
                if (accumulatedPromptTokens !== undefined || accumulatedOutputTokens !== undefined) {
                  const prompt = accumulatedPromptTokens ?? 0;
                  const output = accumulatedOutputTokens ?? 0;
                  usageMetadata = {
                    promptTokenCount: prompt,
                    candidatesTokenCount: output,
                    totalTokenCount: prompt + output,
                  };
                }

                const chunkFunctionCalls = parts
                  .filter((p) => p.functionCall)
                  .map((p) => p.functionCall!);

                if (parts.length > 0 || finishReason || usageMetadata) {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
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
                    functionCalls: chunkFunctionCalls.length > 0 ? chunkFunctionCalls : undefined,
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
        // Cancel the response body to return the HTTP connection to the pool.
        // Without this, an abandoned async generator holds the connection open
        // until the server closes it, starving the pool on subsequent requests.
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
