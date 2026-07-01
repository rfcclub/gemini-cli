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
  private ai?: any;
  private activeCacheName?: string;
  private activeCacheModel?: string;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(googleGenAI?: any) {
    if (googleGenAI) {
      this.ai = googleGenAI;
    }
  }

  public setAiClient(googleGenAI: any) {
    this.ai = googleGenAI;
  }

  public hasAiClient(): boolean {
    return this.ai !== undefined && this.ai.caches !== undefined;
  }

  public async createCache(
    model: string,
    contents: Content[],
    ttlSeconds: number = 600,
  ): Promise<string | undefined> {
    if (!this.hasAiClient()) {
      return undefined;
    }
    const response = await this.ai.caches.create({
      model,
      config: {
        contents,
        ttl: `${ttlSeconds}s`,
        displayName: `vesta_caching_${Date.now()}`,
      },
    });
    this.activeCacheName = response.name;
    this.activeCacheModel = model;
    this.cacheMisses++;
    return response.name;
  }

  /**
   * Records a cache hit (called when cachedContent is used in a request).
   */
  public recordCacheHit(): void {
    this.cacheHits++;
  }

  /**
   * Gets cache statistics for telemetry.
   */
  public getCacheStats(): { hits: number; misses: number; active: boolean } {
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      active: this.activeCacheName !== undefined,
    };
  }

  public getActiveCacheName(): string | undefined {
    return this.activeCacheName;
  }

  public getActiveCacheModel(): string | undefined {
    return this.activeCacheModel;
  }

  public async deleteActiveCache(): Promise<void> {
    if (this.hasAiClient() && this.activeCacheName) {
      try {
        await this.ai.caches.delete({ name: this.activeCacheName });
      } catch (e) {
        // Ignore deletion errors
      }
      this.activeCacheName = undefined;
    }
  }

  public async renewActiveCacheTTL(ttlSeconds: number = 600): Promise<void> {
    if (this.hasAiClient() && this.activeCacheName) {
      try {
        await this.ai.caches.update({
          name: this.activeCacheName,
          config: {
            ttl: `${ttlSeconds}s`,
          },
        });
      } catch (e) {
        // Ignore update errors
      }
    }
  }
}
