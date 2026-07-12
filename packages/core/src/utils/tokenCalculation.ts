/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PartListUnion, Part } from '@google/genai';
import type { ContentGenerator } from '../core/contentGenerator.js';
import { debugLogger } from './debugLogger.js';

// Token estimation constants
// ASCII alphanumeric characters are roughly 3-4 chars per token.
export const ASCII_TOKENS_PER_CHAR = 0.33;
// CJK characters (Chinese, Japanese, Korean) are often 1-2 tokens per char.
// We use 1.5 as a conservative estimate to avoid underestimation.
export const CJK_TOKENS_PER_CHAR = 1.5;
// Backwards-compatible alias — old consumers import NON_ASCII_TOKENS_PER_CHAR
export const NON_ASCII_TOKENS_PER_CHAR = CJK_TOKENS_PER_CHAR;
// Code symbols ({, }, (, ), ;, =, etc.) are typically 1 token per 1-2 chars.
// We use 0.5 as a reasonable mid-point.
export const CODE_SYMBOL_TOKENS_PER_CHAR = 0.5;
// Structural overhead per Content turn (role prefixes, separators).
export const MSG_OVERHEAD_TOKENS = 5;
// Fixed token estimate for images
const IMAGE_TOKEN_ESTIMATE = 3000;
// Fixed token estimate for PDFs (~100 pages at 258 tokens/page)
// See: https://ai.google.dev/gemini-api/docs/document-processing
const PDF_TOKEN_ESTIMATE = 25800;

// Maximum number of characters to process with the full character-by-character heuristic.
// Above this, we use a faster approximation to avoid performance bottlenecks.
const MAX_CHARS_FOR_FULL_HEURISTIC = 100_000;

// Maximum depth for recursive token estimation to prevent stack overflow from
// malicious or buggy nested structures. A depth of 3 is sufficient given
// standard multimodal responses are typically depth 1.
const MAX_RECURSION_DEPTH = 3;

const DEFAULT_CHARS_PER_TOKEN = 4;

// Set of ASCII characters that are code symbols (operators, punctuation).
// These tend to tokenize at a higher rate than alphanumeric text (~0.5 tokens/char).
const CODE_SYMBOLS = new Set([
  '{', '}', '(', ')', '[', ']', ';', '=', '<', '>', '+', '-', '*', '/',
  '&', '|', '!', '?', ':', ',', '.', '@', '#', '$', '%', '^', '~', '`',
  '\\', '"', "'",
]);

/**
 * Returns true if the given Unicode codepoint is a CJK character
 * (Chinese, Japanese, Korean). These tokenize at a higher rate (~1.5 tokens/char).
 * Non-CJK characters above 127 (Vietnamese diacritics, Latin Extended, emoji)
 * are NOT CJK and should be estimated at the ASCII rate.
 */
function isCJK(code: number): boolean {
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||  // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) ||  // CJK Extension A
    (code >= 0xf900 && code <= 0xfaff) ||  // CJK Compatibility Ideographs
    (code >= 0x3040 && code <= 0x309f) ||  // Hiragana
    (code >= 0x30a0 && code <= 0x30ff) ||  // Katakana
    (code >= 0xac00 && code <= 0xd7af) ||  // Hangul Syllables
    (code >= 0xff00 && code <= 0xffef)     // Halfwidth/Fullwidth Forms
  );
}

/**
 * Heuristic estimation of tokens for a text string.
 * Uses a three-tier character classification:
 * 1. CJK characters: 1.5 tokens/char (high density)
 * 2. ASCII code symbols: 0.5 tokens/char (operators, punctuation)
 * 3. Everything else (ASCII alphanumeric, Latin diacritics, Vietnamese): 1/charsPerToken
 */
function estimateTextTokens(text: string, charsPerToken: number): number {
  if (text.length > MAX_CHARS_FOR_FULL_HEURISTIC) {
    return text.length / charsPerToken;
  }

  let tokens = 0;
  const asciiTokensPerChar = 1 / charsPerToken;

  // Optimized loop: charCodeAt is faster than for...of on large strings
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code <= 127) {
      // ASCII: check if it's a code symbol
      if (CODE_SYMBOLS.has(text[i])) {
        tokens += CODE_SYMBOL_TOKENS_PER_CHAR;
      } else {
        tokens += asciiTokensPerChar;
      }
    } else if (isCJK(code)) {
      tokens += CJK_TOKENS_PER_CHAR;
    } else {
      // Non-CJK non-ASCII (Vietnamese diacritics, Latin Extended, emoji)
      // These tokenize at a similar rate to ASCII alphanumeric text.
      tokens += asciiTokensPerChar;
    }
  }
  return tokens;
}

/**
 * Heuristic estimation for media parts (images, PDFs) using fixed safe estimates.
 */
function estimateMediaTokens(part: Part): number | undefined {
  const inlineData = 'inlineData' in part ? part.inlineData : undefined;
  const fileData = 'fileData' in part ? part.fileData : undefined;
  const mimeType = inlineData?.mimeType || fileData?.mimeType;

  if (mimeType?.startsWith('image/')) {
    // Images: 3,000 tokens (covers up to 4K resolution on Gemini 3)
    // See: https://ai.google.dev/gemini-api/docs/vision#token_counting
    return IMAGE_TOKEN_ESTIMATE;
  } else if (mimeType?.startsWith('application/pdf')) {
    // PDFs: 25,800 tokens (~100 pages at 258 tokens/page)
    // See: https://ai.google.dev/gemini-api/docs/document-processing
    return PDF_TOKEN_ESTIMATE;
  }
  return undefined;
}

/**
 * Heuristic estimation for tool responses, avoiding massive string copies
 * and accounting for nested Gemini 3 multimodal parts.
 */
function estimateFunctionResponseTokens(
  part: Part,
  depth: number,
  charsPerToken: number,
): number {
  const fr = part.functionResponse;
  if (!fr) return 0;

  let totalTokens = (fr.name?.length ?? 0) / charsPerToken;
  const response = fr.response as unknown;

  if (typeof response === 'string') {
    totalTokens += response.length / charsPerToken;
  } else if (response !== undefined && response !== null) {
    // For objects, stringify only the payload, not the whole Part object.
    totalTokens += JSON.stringify(response).length / charsPerToken;
  }

  // Gemini 3: Handle nested multimodal parts recursively.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  const nestedParts = (fr as unknown as { parts?: Part[] }).parts;
  if (nestedParts && nestedParts.length > 0) {
    totalTokens += estimateTokenCountSync(
      nestedParts,
      depth + 1,
      charsPerToken,
    );
  }

  return totalTokens;
}

/**
 * Estimates token count for parts synchronously using a heuristic.
 * - Text: character-based heuristic (ASCII vs CJK) for small strings, length/4 for massive ones.
 * - Non-text (Tools, etc): JSON string length / charsPerToken.
 */
export function estimateTokenCountSync(
  parts: Part[],
  depth: number = 0,
  charsPerToken: number = DEFAULT_CHARS_PER_TOKEN,
): number {
  if (depth > MAX_RECURSION_DEPTH) {
    return 0;
  }

  let totalTokens = 0;
  for (const part of parts) {
    if (typeof part.text === 'string') {
      totalTokens += estimateTextTokens(part.text, charsPerToken);
    } else if (part.functionResponse) {
      totalTokens += estimateFunctionResponseTokens(part, depth, charsPerToken);
    } else {
      const mediaEstimate = estimateMediaTokens(part);
      if (mediaEstimate !== undefined) {
        totalTokens += mediaEstimate;
      } else {
        // Fallback for other non-text parts (e.g., functionCall).
        // Note: JSON.stringify(part) here is safe as these parts are typically small.
        totalTokens += JSON.stringify(part).length / charsPerToken;
      }
    }
  }
  return Math.floor(totalTokens);
}

/**
 * Calculates the token count of the request.
 * If the request contains only text or tools, it estimates the token count locally.
 * If the request contains media (images, files), it uses the countTokens API.
 */
export async function calculateRequestTokenCount(
  request: PartListUnion,
  contentGenerator: ContentGenerator,
  model: string,
): Promise<number> {
  const parts: Part[] = Array.isArray(request)
    ? request.map((p) => (typeof p === 'string' ? { text: p } : p))
    : typeof request === 'string'
      ? [{ text: request }]
      : [request];

  // Use countTokens API only for heavy media parts that are hard to estimate.
  const hasMedia = parts.some((p) => {
    const isMedia = 'inlineData' in p || 'fileData' in p;
    return isMedia;
  });

  if (hasMedia) {
    try {
      const response = await contentGenerator.countTokens({
        model,
        contents: [{ role: 'user', parts }],
      });
      return response.totalTokens ?? 0;
    } catch (error) {
      // Fallback to local estimation if the API call fails
      debugLogger.debug('countTokens API failed:', error);
      return estimateTokenCountSync(parts, 0, DEFAULT_CHARS_PER_TOKEN);
    }
  }

  return estimateTokenCountSync(parts, 0, DEFAULT_CHARS_PER_TOKEN);
}
