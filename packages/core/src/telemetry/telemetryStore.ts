/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  callCount: number;
  costUsd: number;
}

export interface SessionStats {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalDurationMs: number;
  apiCallCount: number;
  activeModel: string;
  /** Per-model usage breakdown */
  modelBreakdown?: Record<string, ModelUsage>;
  /** Total estimated cost in USD */
  totalCostUsd?: number;
}

/**
 * Cost rates per 1 Million tokens (USD).
 * Sources: official pricing pages as of 2026.
 * Format: { input, output, cached } per 1M tokens.
 */
const COST_TABLE: Record<string, { input: number; output: number; cached: number }> = {
  // Gemini models
  'gemini-2.5-pro': { input: 1.25, output: 5.0, cached: 0.625 },
  'gemini-2.5-flash': { input: 0.075, output: 0.3, cached: 0.0375 },
  'gemini-2.0-pro': { input: 1.25, output: 5.0, cached: 0.625 },
  'gemini-2.0-flash': { input: 0.075, output: 0.3, cached: 0.0375 },
  'gemini-1.5-pro': { input: 1.25, output: 5.0, cached: 0.625 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3, cached: 0.0375 },
  // Anthropic models
  'claude-4-opus': { input: 15.0, output: 75.0, cached: 1.5 },
  'claude-4-sonnet': { input: 3.0, output: 15.0, cached: 0.3 },
  'claude-3.5-sonnet': { input: 3.0, output: 15.0, cached: 0.3 },
  'claude-3.5-haiku': { input: 0.8, output: 4.0, cached: 0.08 },
  // OpenAI models
  'gpt-4o': { input: 2.5, output: 10.0, cached: 1.25 },
  'gpt-4o-mini': { input: 0.15, output: 0.6, cached: 0.075 },
  'gpt-4-turbo': { input: 10.0, output: 30.0, cached: 5.0 },
  'o1': { input: 15.0, output: 60.0, cached: 7.5 },
  'o3': { input: 10.0, output: 40.0, cached: 2.5 },
  'o3-mini': { input: 1.1, output: 4.4, cached: 0.55 },
  'o4-mini': { input: 1.1, output: 4.4, cached: 0.55 },
};

function getCostRates(model: string): { input: number; output: number; cached: number } {
  const lower = model.toLowerCase();
  // Exact match first
  for (const [key, rates] of Object.entries(COST_TABLE)) {
    if (lower.includes(key)) {
      return rates;
    }
  }
  // Fallback: heuristic matching
  if (lower.includes('pro')) return { input: 1.25, output: 5.0, cached: 0.625 };
  if (lower.includes('flash') || lower.includes('haiku')) return { input: 0.075, output: 0.3, cached: 0.0375 };
  if (lower.includes('opus')) return { input: 15.0, output: 75.0, cached: 1.5 };
  if (lower.includes('sonnet')) return { input: 3.0, output: 15.0, cached: 0.3 };
  if (lower.includes('gpt-4o')) return { input: 2.5, output: 10.0, cached: 1.25 };
  // Default to Flash rates
  return { input: 0.075, output: 0.3, cached: 0.0375 };
}

export function calculateModelCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number,
): number {
  const rates = getCostRates(model);
  return (
    (inputTokens / 1_000_000) * rates.input +
    (cachedTokens / 1_000_000) * rates.cached +
    (outputTokens / 1_000_000) * rates.output
  );
}

export class TelemetryStore {
  private readonly filepath: string;

  constructor() {
    this.filepath = path.join(
      os.tmpdir(),
      `gemini-vesta-telemetry-${process.pid}.json`,
    );
  }

  /**
   * Retrieves the current session stats, defaulting if file doesn't exist.
   */
  public getStats(): SessionStats {
    try {
      if (fs.existsSync(this.filepath)) {
        const content = fs.readFileSync(this.filepath, 'utf8');
        return JSON.parse(content) as SessionStats;
      }
    } catch (e) {
      // Return default on read/parse failure
    }

    return {
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      totalDurationMs: 0,
      apiCallCount: 0,
      activeModel: 'unknown',
      modelBreakdown: {},
      totalCostUsd: 0,
    };
  }

  /**
   * Records a new turn's API token usage into the cumulative stats.
   */
  public recordEvent(
    input: number,
    output: number,
    cached: number,
    model: string,
    durationMs: number,
  ): void {
    const stats = this.getStats();

    stats.inputTokens += input;
    stats.outputTokens += output;
    stats.cachedTokens += cached;
    stats.totalDurationMs += durationMs;
    stats.apiCallCount += 1;
    stats.activeModel = model;

    // Per-model breakdown tracking
    if (!stats.modelBreakdown) {
      stats.modelBreakdown = {};
    }
    const key = model.toLowerCase();
    if (!stats.modelBreakdown[key]) {
      stats.modelBreakdown[key] = {
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        callCount: 0,
        costUsd: 0,
      };
    }
    const breakdown = stats.modelBreakdown[key];
    breakdown.inputTokens += input;
    breakdown.outputTokens += output;
    breakdown.cachedTokens += cached;
    breakdown.callCount += 1;
    breakdown.costUsd = calculateModelCost(
      key,
      breakdown.inputTokens,
      breakdown.outputTokens,
      breakdown.cachedTokens,
    );

    // Total cost
    stats.totalCostUsd = Object.values(stats.modelBreakdown).reduce(
      (sum, m) => sum + m.costUsd,
      0,
    );

    try {
      fs.writeFileSync(this.filepath, JSON.stringify(stats, null, 2), 'utf8');
    } catch (e) {
      // Ignore write errors
    }
  }

  /**
   * Calculates estimated API cost vs actual cost, and total savings in USD.
   */
  public calculateSavings(customStats?: SessionStats): {
    standardCostUsd: number;
    actualCostUsd: number;
    savingsUsd: number;
  } {
    const stats = customStats || this.getStats();
    const rates = getCostRates(stats.activeModel);

    // Uncached / standard cost (if caching wasn't used, all cached tokens would be standard input tokens)
    const totalInputAsUncached = stats.inputTokens + stats.cachedTokens;
    const standardCostUsd =
      (totalInputAsUncached / 1_000_000) * rates.input +
      (stats.outputTokens / 1_000_000) * rates.output;

    // Actual cost using caching
    const actualCostUsd =
      (stats.inputTokens / 1_000_000) * rates.input +
      (stats.cachedTokens / 1_000_000) * rates.cached +
      (stats.outputTokens / 1_000_000) * rates.output;

    const savingsUsd = Math.max(0, standardCostUsd - actualCostUsd);

    return {
      standardCostUsd: parseFloat(standardCostUsd.toFixed(6)),
      actualCostUsd: parseFloat(actualCostUsd.toFixed(6)),
      savingsUsd: parseFloat(savingsUsd.toFixed(6)),
    };
  }

  /**
   * Aggregates stats from all active/recent session telemetry files in os.tmpdir()
   */
  public getCumulativeStats(): { stats: SessionStats; count: number } {
    const dir = os.tmpdir();
    const prefix = 'gemini-vesta-telemetry-';
    const suffix = '.json';

    const aggregated: SessionStats = {
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      totalDurationMs: 0,
      apiCallCount: 0,
      activeModel: 'unknown',
    };

    let filesCount = 0;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.startsWith(prefix) && file.endsWith(suffix)) {
          const filepath = path.join(dir, file);
          try {
            const content = fs.readFileSync(filepath, 'utf8');
            const data = JSON.parse(content) as SessionStats;
            aggregated.inputTokens += data.inputTokens;
            aggregated.outputTokens += data.outputTokens;
            aggregated.cachedTokens += data.cachedTokens;
            aggregated.totalDurationMs += data.totalDurationMs;
            aggregated.apiCallCount += data.apiCallCount;
            if (data.activeModel !== 'unknown' && data.activeModel !== '') {
              aggregated.activeModel = data.activeModel;
            }
            filesCount++;
          } catch (e) {
            // Ignore single file parse errors
          }
        }
      }
    } catch (e) {
      // Ignore directory read errors
    }

    return { stats: aggregated, count: filesCount };
  }

  /**
   * Deletes the session JSON telemetry file.
   */
  public clear(): void {
    try {
      if (fs.existsSync(this.filepath)) {
        fs.unlinkSync(this.filepath);
      }
    } catch (e) {
      // Ignore deletion errors
    }
  }
}
