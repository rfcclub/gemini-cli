/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AffirmationGuard } from './affirmationGuard.js';

describe('AffirmationGuard', () => {
  describe('isAffirmation', () => {
    it('should detect English affirmations', () => {
      expect(AffirmationGuard.isAffirmation('ok')).toBe(true);
      expect(AffirmationGuard.isAffirmation('okay')).toBe(true);
      expect(AffirmationGuard.isAffirmation('yes')).toBe(true);
      expect(AffirmationGuard.isAffirmation('yep')).toBe(true);
      expect(AffirmationGuard.isAffirmation('sure')).toBe(true);
      expect(AffirmationGuard.isAffirmation('go ahead')).toBe(true);
      expect(AffirmationGuard.isAffirmation('proceed')).toBe(true);
    });

    it('should detect Vietnamese affirmations', () => {
      expect(AffirmationGuard.isAffirmation('tiếp đi')).toBe(true);
      expect(AffirmationGuard.isAffirmation('triển đi')).toBe(true);
      expect(AffirmationGuard.isAffirmation('triển luôn')).toBe(true);
      expect(AffirmationGuard.isAffirmation('đúng rồi')).toBe(true);
      expect(AffirmationGuard.isAffirmation('được rồi')).toBe(true);
      expect(AffirmationGuard.isAffirmation('chuẩn')).toBe(true);
      expect(AffirmationGuard.isAffirmation('múc')).toBe(true);
    });

    it('should detect affirmations with punctuation', () => {
      expect(AffirmationGuard.isAffirmation('ok!')).toBe(true);
      expect(AffirmationGuard.isAffirmation('yes.')).toBe(true);
      expect(AffirmationGuard.isAffirmation('sure?')).toBe(true);
    });

    it('should reject non-affirmations', () => {
      expect(AffirmationGuard.isAffirmation('ok, but can you also fix the test?')).toBe(false);
      expect(AffirmationGuard.isAffirmation('yes, that is correct but I need more')).toBe(false);
      expect(AffirmationGuard.isAffirmation('please read the file and edit it')).toBe(false);
    });

    it('should reject empty or very long strings', () => {
      expect(AffirmationGuard.isAffirmation('')).toBe(false);
      expect(AffirmationGuard.isAffirmation('   ')).toBe(false);
      expect(
        AffirmationGuard.isAffirmation(
          'ok this is a very long message that exceeds the twenty character limit',
        ),
      ).toBe(false);
    });
  });

  describe('getLastEnabledTools / setLastEnabledTools', () => {
    beforeEach(() => {
      AffirmationGuard.resetState();
    });

    it('should store and retrieve last enabled tools', () => {
      AffirmationGuard.setLastEnabledTools(['read_file', 'grep_search']);

      const tools = AffirmationGuard.getLastEnabledTools();

      expect(tools).toEqual(['read_file', 'grep_search']);
    });

    it('should return undefined when no tools have been stored', () => {
      const tools = AffirmationGuard.getLastEnabledTools();

      expect(tools).toBeUndefined();
    });

    it('should return stored tools and clear them on getAndClear', () => {
      AffirmationGuard.setLastEnabledTools(['write_file', 'replace']);

      const tools = AffirmationGuard.getAndClearLastEnabledTools();

      expect(tools).toEqual(['write_file', 'replace']);
      expect(AffirmationGuard.getLastEnabledTools()).toBeUndefined();
    });
  });
});
