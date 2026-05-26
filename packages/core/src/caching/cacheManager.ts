/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Content } from '@google/genai';

/**
 * Handles creation, lifecycle, and TTL renewals of Gemini Context Caches.
 */
export class CacheManager {
  private ai?: any;
  private activeCacheName?: string;
  private activeCacheModel?: string;

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
    ttlSeconds: number = 300,
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
    return response.name;
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

  public async renewActiveCacheTTL(ttlSeconds: number = 300): Promise<void> {
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
