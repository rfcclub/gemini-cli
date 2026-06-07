/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { createUserContent } from '@google/genai';
import type { Config } from '../../config/config.js';
import { isFunctionResponse } from '../../utils/messageInspectors.js';
import { partListUnionToString } from '../../core/geminiRequest.js';
import type {
  RoutingContext,
  RoutingDecision,
  RoutingStrategy,
} from '../routingStrategy.js';
import type { BaseLlmClient } from '../../core/baseLlmClient.js';
import type { LocalLiteRtLmClient } from '../../core/localLiteRtLmClient.js';

/**
 * A deterministic routing strategy that uses weighted regex to prune tools.
 * This saves tokens by only providing tools relevant to the detected task category.
 */
export class DeterministicToolRoutingStrategy implements RoutingStrategy {
  readonly name = 'deterministic-tool-router';

  async route(
    context: RoutingContext,
    config: Config,
    _baseLlmClient: BaseLlmClient,
    _localLiteRtLmClient: LocalLiteRtLmClient,
  ): Promise<RoutingDecision | null> {
    const startTime = Date.now();

    // Bypass if request is a function response (continuity is handled by Affirmation Guard later)
    if (isFunctionResponse(createUserContent(context.request))) {
      return null;
    }

    const promptText = partListUnionToString(context.request).toLowerCase();

    // Define categories and their regex patterns + associated tools
    // Task categories: Read, Write, Run, Search, Plan, Respond
    const categories = [
      {
        name: 'Read',
        patterns: [/\bread\b/, /\bview\b/, /\bshow\b/, /\bcat\b/, /\blist\b/, /\bls\b/, /\bdir\b/],
        tools: ['list_directory', 'read_file', 'glob', 'grep_search'],
      },
      {
        name: 'Write',
        patterns: [/\bwrite\b/, /\bedit\b/, /\bchange\b/, /\bupdate\b/, /\bpatch\b/, /\breplace\b/, /\bcreate\b/, /\bmkdir\b/],
        tools: ['write_file', 'replace', 'run_shell_command'], // run_shell_command for mkdir, etc.
      },
      {
        name: 'Run',
        patterns: [/\brun\b/, /\bexecute\b/, /\btest\b/, /\bnpm\b/, /\bnode\b/, /\bpython\b/, /\bmake\b/, /\bgit\b/],
        tools: ['run_shell_command'],
      },
      {
        name: 'Search',
        patterns: [/\bsearch\b/, /\bfind\b/, /\bgrep\b/, /\blookup\b/, /\bgoogle\b/, /\bweb\b/],
        tools: ['grep_search', 'glob', 'google_web_search', 'web_fetch'],
      },
    ];

    const matchedTools = new Set<string>();
    let matchedAny = false;

    for (const category of categories) {
      if (category.patterns.some((p) => p.test(promptText))) {
        category.tools.forEach((t) => matchedTools.add(t));
        matchedAny = true;
      }
    }

    // If no category matched, we don't prune (return null to let other strategies decide or use default)
    // However, for the "Cognition Adapter" vision, we might want to default to a minimal set
    // if it looks like a plain response.
    if (!matchedAny) {
      // Check for Affirmation patterns (Affirmation Guard)
      const affirmationPatterns = [/^\s*ok(ay)?\s*$/i, /^\s*yes\s*$/i, /^\s*go ahead\s*$/i, /^\s*yup\s*$/i];
      if (affirmationPatterns.some((p) => p.test(promptText))) {
         // For affirmations, we'd ideally want to look at history, but for now we just don't prune.
         return null;
      }
      return null;
    }

    // Always include mandatory/utility tools if they exist
    // matchedTools.add('ask_user'); // etc.

    const latencyMs = Date.now() - startTime;
    return {
      model: config.getModel(),
      enabledTools: Array.from(matchedTools),
      metadata: {
        source: 'DeterministicToolRouter',
        latencyMs,
        reasoning: `Deterministic regex matched task categories. Pruned tools to: ${Array.from(matchedTools).join(', ')}`,
      },
    };
  }
}
