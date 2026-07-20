/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAiCompatibleProvider } from './openAiCompatibleProvider.js';
import type { GenerateContentParameters } from '@google/genai';
import { LlmRole } from '../telemetry/llmRole.js';

describe('OpenAiCompatibleProvider', () => {
  const deepSeekConfig = {
    type: 'openai-compatible' as const,
    apiKey: 'sk-deepseek',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-coder',
  };
  const ollamaConfig = {
    type: 'openai-compatible' as const,
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'qwen2.5-coder',
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should support DeepSeek style configuration', async () => {
    const provider = new OpenAiCompatibleProvider(deepSeekConfig);
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'DeepSeek response' } }],
        usage: { total_tokens: 5 },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const request: GenerateContentParameters = {
      model: 'deepseek-coder',
      contents: [{ role: 'user', parts: [{ text: 'DeepSeek?' }] }],
    };

    const response = await provider.generateContent(request, 'id', LlmRole.UTILITY_TOOL);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.deepseek.com/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-deepseek',
        }),
      }),
    );
    expect(response.candidates?.[0]?.content?.parts?.[0]?.text).toBe('DeepSeek response');
  });

  it('should support Ollama style configuration (no auth)', async () => {
    const provider = new OpenAiCompatibleProvider(ollamaConfig);
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Ollama response' } }],
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const request: GenerateContentParameters = {
      model: 'qwen2.5-coder',
      contents: [{ role: 'user', parts: [{ text: 'Ollama?' }] }],
    };

    const response = await provider.generateContent(request, 'id', LlmRole.UTILITY_TOOL);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/v1/chat/completions',
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      }),
    );
    expect(response.candidates?.[0]?.content?.parts?.[0]?.text).toBe('Ollama response');
  });

  it('should estimate token count when OpenAI-compat response has no usage data', async () => {
    const provider = new OpenAiCompatibleProvider(deepSeekConfig);
    const mockFetch = vi.mocked(fetch);
    // DeepSeek/Ollama sometimes omit usage field
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Response without usage metadata.' } }],
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const request: GenerateContentParameters = {
      model: 'deepseek-coder',
      contents: [{ role: 'user', parts: [{ text: 'Help me with code' }] }],
    };

    const response = await provider.generateContent(request, 'id', LlmRole.UTILITY_TOOL);

    expect(response.usageMetadata).toBeDefined();
    expect(response.usageMetadata?.totalTokenCount).toBeGreaterThan(0);
    expect(response.usageMetadata?.promptTokenCount).toBeGreaterThan(0);
    expect(response.usageMetadata?.candidatesTokenCount).toBeGreaterThan(0);
  });

  it('should serialize zero-arg tool call args as "{}" not undefined', async () => {
    // Regression: JSON.stringify(undefined) returns undefined (not "{}"),
    // which drops function.arguments from the request and causes OpenAI API
    // rejection on turn 2 when history is replayed with that tool call.
    const provider = new OpenAiCompatibleProvider(deepSeekConfig);
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Done' } }],
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const request: GenerateContentParameters = {
      model: 'deepseek-coder',
      contents: [
        { role: 'user', parts: [{ text: 'Call the tool' }] },
        {
          role: 'model',
          // args: undefined simulates a zero-argument function call
          parts: [{ functionCall: { name: 'get_time', args: undefined } }],
        },
        {
          role: 'user',
          parts: [{ functionResponse: { name: 'get_time', response: { time: '12:00' } } }],
        },
      ],
    };

    await provider.generateContent(request, 'id', LlmRole.UTILITY_TOOL);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body as string);
    const assistantMsg = body.messages.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m: any) => m.role === 'assistant' && m.tool_calls?.length > 0,
    );
    expect(assistantMsg).toBeDefined();
    // Must be a valid JSON string, not undefined or missing
    expect(assistantMsg.tool_calls[0].function.arguments).toBe('{}');
  });

  it('should correctly correlate tool_call_ids in multi-turn history', async () => {
    // Regression: mapMessages must generate matching tool_call_ids between the
    // assistant tool_calls entry and the tool response entry within one call.
    const provider = new OpenAiCompatibleProvider(deepSeekConfig);
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Turn 2 answer' } }],
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // Turn 2 request — full history including turn 1 tool call roundtrip
    const request: GenerateContentParameters = {
      model: 'deepseek-coder',
      contents: [
        { role: 'user', parts: [{ text: 'turn 1 prompt' }] },
        {
          role: 'model',
          parts: [{ functionCall: { name: 'read_file', args: { path: '/tmp/f' } } }],
        },
        {
          role: 'user',
          parts: [{ functionResponse: { name: 'read_file', response: { content: 'hello' } } }],
        },
        { role: 'model', parts: [{ text: 'turn 1 answer' }] },
        { role: 'user', parts: [{ text: 'turn 2 prompt' }] },
      ],
    };

    const response = await provider.generateContent(request, 'id', LlmRole.UTILITY_TOOL);
    expect(response.candidates?.[0]?.content?.parts?.[0]?.text).toBe('Turn 2 answer');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body as string);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolMsg = body.messages.find((m: any) => m.role === 'tool');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assistantMsg = body.messages.find((m: any) => m.tool_calls?.length > 0);
    expect(toolMsg).toBeDefined();
    expect(assistantMsg).toBeDefined();
    // tool_call_id in tool message must match the id in assistant's tool_calls
    expect(toolMsg.tool_call_id).toBe(assistantMsg.tool_calls[0].id);
  });

  describe('generateContentStream', () => {
    type SseStream = ReadableStream<Uint8Array> & { cancel: () => Promise<void> };
    type SseStreamWithMock = SseStream & { __cancelMock: ReturnType<typeof vi.fn> };

    function makeSseStream(chunks: string[]): SseStreamWithMock {
      const encoder = new TextEncoder();
      const cancelMock = vi.fn().mockResolvedValue(undefined);
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
        cancel() {
          return cancelMock();
        },
      });
      // Expose the cancel mock for assertions
      return Object.assign(stream, { __cancelMock: cancelMock });
    }

    it('should map non-standard finish_reason values to STOP', async () => {
      // Regression: Ollama/custom providers use values like 'eos' or 'end_turn'
      // that were not in the if-else chain, leaving finishReason undefined.
      const provider = new OpenAiCompatibleProvider(ollamaConfig);
      const mockFetch = vi.mocked(fetch);
      const stream = makeSseStream([
        'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":null}]}\n\n',
        'data: {"choices":[{"delta":{},"finish_reason":"eos"}]}\n\n',
        'data: [DONE]\n\n',
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockFetch.mockResolvedValue({ ok: true, body: stream } as any);

      const request: GenerateContentParameters = {
        model: 'qwen2.5-coder',
        contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
      };

      const gen = await provider.generateContentStream(request, 'id', LlmRole.UTILITY_TOOL);
      const chunks = [];
      for await (const chunk of gen) {
        chunks.push(chunk);
      }

      const finishChunk = chunks.find(c => c.candidates?.[0]?.finishReason);
      expect(finishChunk?.candidates?.[0]?.finishReason).toBe('STOP');
    });

    it('should emit synthetic STOP when stream ends without [DONE]', async () => {
      // Regression: some Ollama versions close the TCP connection without a
      // [DONE] SSE line, leaving no chunk with finishReason → NO_FINISH_REASON error.
      const provider = new OpenAiCompatibleProvider(ollamaConfig);
      const mockFetch = vi.mocked(fetch);
      const stream = makeSseStream([
        'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
        // No [DONE] — TCP closes here
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockFetch.mockResolvedValue({ ok: true, body: stream } as any);

      const request: GenerateContentParameters = {
        model: 'qwen2.5-coder',
        contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
      };

      const gen = await provider.generateContentStream(request, 'id', LlmRole.UTILITY_TOOL);
      const chunks = [];
      for await (const chunk of gen) {
        chunks.push(chunk);
      }

      const finishChunk = chunks.find(c => c.candidates?.[0]?.finishReason);
      expect(finishChunk?.candidates?.[0]?.finishReason).toBe('STOP');
    });

    it('should cancel response body when generator is fully consumed', async () => {
      // Regression: not calling responseBody.cancel() holds the TCP connection
      // open, starving the connection pool on subsequent requests.
      const provider = new OpenAiCompatibleProvider(ollamaConfig);
      const mockFetch = vi.mocked(fetch);
      const stream = makeSseStream([
        'data: {"choices":[{"delta":{"content":"chunk"},"finish_reason":null}]}\n\n',
        'data: [DONE]\n\n',
      ]);
      // Spy directly on the instance's cancel method (JSDOM ReadableStream
      // does not call the constructor cancel option; spy on the method instead).
      const cancelSpy = vi.spyOn(stream, 'cancel').mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockFetch.mockResolvedValue({ ok: true, body: stream } as any);

      const request: GenerateContentParameters = {
        model: 'qwen2.5-coder',
        contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
      };

      const gen = await provider.generateContentStream(request, 'id', LlmRole.UTILITY_TOOL);
      // Consume all chunks
      for await (const _ of gen) { /* noop */ }

      // responseBody.cancel() must have been called to release the HTTP connection
      expect(cancelSpy).toHaveBeenCalled();
    });
  });
});
