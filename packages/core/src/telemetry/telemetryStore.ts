/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';

export interface SessionStats {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalDurationMs: number;
  apiCallCount: number;
  activeModel: string;
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
    const model = stats.activeModel.toLowerCase();

    // Default rates per 1 Million tokens
    let inputRate = 0.075; // Flash input
    let outputRate = 0.3; // Flash output
    let cachedRate = 0.0375; // Flash cached (50% discount)

    if (model.includes('pro')) {
      inputRate = 1.25; // Pro input
      outputRate = 5.0; // Pro output
      cachedRate = 0.625; // Pro cached
    }

    // Uncached / standard cost (if caching wasn't used, all cached tokens would be standard input tokens)
    const totalInputAsUncached = stats.inputTokens + stats.cachedTokens;
    const standardCostUsd =
      (totalInputAsUncached / 1_000_000) * inputRate +
      (stats.outputTokens / 1_000_000) * outputRate;

    // Actual cost using caching
    const actualCostUsd =
      (stats.inputTokens / 1_000_000) * inputRate +
      (stats.cachedTokens / 1_000_000) * cachedRate +
      (stats.outputTokens / 1_000_000) * outputRate;

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
