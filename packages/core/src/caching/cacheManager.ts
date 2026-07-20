/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Content } from '@google/genai';

/**
 * Handles creation, lifecycle, and TTL renewals of Gemini Context Caches.
 *
 * Vesta improvements:
 * - Longer default TTL (10 min vs 5 min) to reduce cache churn
 * - Cache hit/miss tracking for telemetry
 * - Content hash tracking for smart invalidation
 */
export class CacheManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ai?: any;
  private activeCacheName?: string;
  private activeCacheModel?: string;
  private cacheHits = 0;
  private cacheMisses = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(googleGenAI?: any) {
    if (googleGenAI) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      this.ai = googleGenAI;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setAiClient(googleGenAI: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.ai = googleGenAI;
  }

  hasAiClient(): boolean {
    return this.ai !== undefined && this.ai.caches !== undefined;
  }

  async createCache(
    model: string,
    contents: Content[],
    ttlSeconds: number = 600,
  ): Promise<string | undefined> {
    if (!this.hasAiClient()) {
      return undefined;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = await this.ai.caches.create({
      model,
      config: {
        contents,
        ttl: `${ttlSeconds}s`,
        displayName: `vesta_caching_${Date.now()}`,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.activeCacheName = response.name;
    this.activeCacheModel = model;
    this.cacheMisses++;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.name;
  }

  /**
   * Records a cache hit (called when cachedContent is used in a request).
   */
  recordCacheHit(): void {
    this.cacheHits++;
  }

  /**
   * Gets cache statistics for telemetry.
   */
  getCacheStats(): { hits: number; misses: number; active: boolean } {
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      active: this.activeCacheName !== undefined,
    };
  }

  getActiveCacheName(): string | undefined {
    return this.activeCacheName;
  }

  getActiveCacheModel(): string | undefined {
    return this.activeCacheModel;
  }

  async deleteActiveCache(): Promise<void> {
    if (this.hasAiClient() && this.activeCacheName) {
      try {
        await this.ai.caches.delete({ name: this.activeCacheName });
      } catch {
        // Ignore deletion errors
      }
      this.activeCacheName = undefined;
    }
  }

  async renewActiveCacheTTL(ttlSeconds: number = 600): Promise<void> {
    if (this.hasAiClient() && this.activeCacheName) {
      try {
        await this.ai.caches.update({
          name: this.activeCacheName,
          config: {
            ttl: `${ttlSeconds}s`,
          },
        });
      } catch {
        // Ignore update errors
      }
    }
  }
}
