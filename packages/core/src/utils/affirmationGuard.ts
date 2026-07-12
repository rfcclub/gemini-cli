/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility to detect simple user affirmations.
 * Used to bypass expensive routing or thinking when the user just says "ok".
 *
 * Also stores the last routing decision's enabledTools so that when an
 * affirmation is detected, the previous turn's tool pruning can be re-applied
 * instead of falling back to the full tool set.
 */
export class AffirmationGuard {
  private static readonly AFFIRMATION_PATTERNS = [
    /^\s*ok(ay)?\s*[!.?]*\s*$/i,
    /^\s*yes\s*[!.?]*\s*$/i,
    /^\s*yep\s*[!.?]*\s*$/i,
    /^\s*yup\s*[!.?]*\s*$/i,
    /^\s*sure\s*[!.?]*\s*$/i,
    /^\s*go\s*ahead\s*[!.?]*\s*$/i,
    /^\s*ti\u1EBFp\s*\u0111i\s*[!.?]*\s*$/i,
    /^\s*tri\u1EC3n\s*(\u0111i|lu\u00F4n)\s*[!.?]*\s*$/i,
    /^\s*\u0111\u00FAng\s*r\u1ed3i\s*[!.?]*\s*$/i,
    /^\s*\u0111\u01B0\u1EE3c\s*r\u1ed3i\s*[!.?]*\s*$/i,
    /^\s*chu\u1EA9n\s*[!.?]*\s*$/i,
    /^\s*confirm(ed)?\s*[!.?]*\s*$/i,
    /^\s*proceed\s*[!.?]*\s*$/i,
    /^\s*m\u00FAc\s*[!.?]*\s*$/i,
  ];

  private static lastEnabledTools: string[] | undefined;

  static isAffirmation(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.length > 20) return false;
    return this.AFFIRMATION_PATTERNS.some((p) => p.test(trimmed));
  }

  static setLastEnabledTools(tools: string[] | undefined): void {
    this.lastEnabledTools = tools ? [...tools] : undefined;
  }

  static getLastEnabledTools(): string[] | undefined {
    return this.lastEnabledTools;
  }

  static getAndClearLastEnabledTools(): string[] | undefined {
    const tools = this.lastEnabledTools;
    this.lastEnabledTools = undefined;
    return tools;
  }

  static resetState(): void {
    this.lastEnabledTools = undefined;
  }
}
