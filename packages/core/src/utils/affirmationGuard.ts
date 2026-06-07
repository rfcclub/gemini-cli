/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility to detect simple user affirmations.
 * Used to bypass expensive routing or thinking when the user just says "ok".
 */
export class AffirmationGuard {
  private static readonly AFFIRMATION_PATTERNS = [
    /^\s*ok(ay)?\s*[!.?]*\s*$/i,
    /^\s*yes\s*[!.?]*\s*$/i,
    /^\s*yep\s*[!.?]*\s*$/i,
    /^\s*yup\s*[!.?]*\s*$/i,
    /^\s*sure\s*[!.?]*\s*$/i,
    /^\s*go\s*ahead\s*[!.?]*\s*$/i,
    /^\s*tiếp\s*đi\s*[!.?]*\s*$/i,
    /^\s*triển\s*(đi|luôn)\s*[!.?]*\s*$/i,
    /^\s*đúng\s*rồi\s*[!.?]*\s*$/i,
    /^\s*được\s*rồi\s*[!.?]*\s*$/i,
    /^\s*chuẩn\s*[!.?]*\s*$/i,
    /^\s*confirm(ed)?\s*[!.?]*\s*$/i,
    /^\s*proceed\s*[!.?]*\s*$/i,
    /^\s*múc\s*[!.?]*\s*$/i,
  ];

  /**
   * Returns true if the text is a simple affirmation.
   */
  static isAffirmation(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.length > 20) return false; // Too long to be a simple affirmation
    return this.AFFIRMATION_PATTERNS.some((p) => p.test(trimmed));
  }
}
