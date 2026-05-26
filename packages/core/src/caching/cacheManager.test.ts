/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheManager } from './cacheManager.js';

describe('CacheManager', () => {
  let mockAi: any;
  let mockCaches: any;

  beforeEach(() => {
    mockCaches = {
      create: vi
        .fn()
        .mockResolvedValue({ name: 'cachedContents/test-cache-id' }),
      delete: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    };
    mockAi = {
      caches: mockCaches,
    };
  });

  it('should create a context cache and save its resource name', async () => {
    const manager = new CacheManager(mockAi);
    const mockContents = [
      { role: 'user', parts: [{ text: 'System Instructions' }] },
    ];

    const cacheName = await manager.createCache(
      'gemini-2.0-flash',
      mockContents,
      300,
    );

    expect(cacheName).toBe('cachedContents/test-cache-id');
    expect(manager.getActiveCacheName()).toBe('cachedContents/test-cache-id');
    expect(mockCaches.create).toHaveBeenCalledWith({
      model: 'gemini-2.0-flash',
      config: {
        contents: mockContents,
        ttl: '300s',
        displayName: expect.stringContaining('vesta_caching_'),
      },
    });
  });

  it('should delete the active cache', async () => {
    const manager = new CacheManager(mockAi);
    const mockContents = [
      { role: 'user', parts: [{ text: 'System Instructions' }] },
    ];

    await manager.createCache('gemini-2.0-flash', mockContents, 300);
    await manager.deleteActiveCache();

    expect(manager.getActiveCacheName()).toBeUndefined();
    expect(mockCaches.delete).toHaveBeenCalledWith({
      name: 'cachedContents/test-cache-id',
    });
  });

  it('should renew the active cache TTL', async () => {
    const manager = new CacheManager(mockAi);
    const mockContents = [
      { role: 'user', parts: [{ text: 'System Instructions' }] },
    ];

    await manager.createCache('gemini-2.0-flash', mockContents, 300);
    await manager.renewActiveCacheTTL(600);

    expect(mockCaches.update).toHaveBeenCalledWith({
      name: 'cachedContents/test-cache-id',
      config: {
        ttl: '600s',
      },
    });
  });
});
