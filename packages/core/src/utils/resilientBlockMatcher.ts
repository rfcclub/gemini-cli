/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MatchIndex {
  lineIndex: number; // 0-based line index where the match starts in the source
  indentation: string; // The exact indentation sequence of the first matched line
}

export class ResilientBlockMatcher {
  /**
   * Normalizes a line of text:
   * 1. Strips leading and trailing whitespace.
   * 2. Replaces all internal runs of whitespace (spaces, tabs) with a single space.
   */
  public static normalizeLine(line: string): string {
    return line.trim().replace(/\s+/g, ' ');
  }

  /**
   * Performs formatting-insensitive, non-overlapping block matching.
   * Both line endings and whitespaces are normalized.
   */
  public static findMatches(
    sourceText: string,
    targetBlock: string
  ): MatchIndex[] {
    const normalizedSource = sourceText.replace(/\r\n/g, '\n');
    const normalizedTargetBlock = targetBlock.replace(/\r\n/g, '\n');

    const sourceLines = normalizedSource.split('\n');
    const targetLines = normalizedTargetBlock.split('\n');

    if (
      targetLines.length === 0 ||
      (targetLines.length === 1 && targetLines[0] === '')
    ) {
      return [];
    }

    const normSourceLines = sourceLines.map((l) => this.normalizeLine(l));
    const normTargetLines = targetLines.map((l) => this.normalizeLine(l));

    const matches: MatchIndex[] = [];
    const N = normTargetLines.length;

    let i = 0;
    while (i <= normSourceLines.length - N) {
      let isMatch = true;
      for (let j = 0; j < N; j++) {
        if (normSourceLines[i + j] !== normTargetLines[j]) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        // Extract exact indentation of the first matched source line
        const originalLine = sourceLines[i];
        const indentMatch = originalLine.match(/^([ \t]*)/);
        const indentation = indentMatch ? indentMatch[1] : '';

        matches.push({
          lineIndex: i,
          indentation,
        });

        // Fast-forward to ensure non-overlapping matches
        i += N;
      } else {
        i++;
      }
    }

    return matches;
  }
}
