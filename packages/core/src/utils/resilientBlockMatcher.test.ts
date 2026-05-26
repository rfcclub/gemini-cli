/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { ResilientBlockMatcher } from './resilientBlockMatcher.js';

describe('ResilientBlockMatcher', () => {
  it('should normalize lines correctly', () => {
    expect(ResilientBlockMatcher.normalizeLine('   let    x    =  1;   ')).toBe('let x = 1;');
    expect(ResilientBlockMatcher.normalizeLine('\tconst\tfoo\t=\tbar;\r')).toBe('const foo = bar;');
    expect(ResilientBlockMatcher.normalizeLine('   ')).toBe('');
  });

  it('should find exact matches and preserve indentation', () => {
    const source = 'line1\n  line2\n    line3\nline4';
    const target = 'line2\n  line3';
    const matches = ResilientBlockMatcher.findMatches(source, target);

    expect(matches).toHaveLength(1);
    expect(matches[0].lineIndex).toBe(1);
    expect(matches[0].indentation).toBe('  ');
  });

  it('should match with different formatting and spacing', () => {
    const source = '  const   x   =   1;\n\tlet   y   =   2;';
    const target = 'const x = 1;\nlet y = 2;';
    const matches = ResilientBlockMatcher.findMatches(source, target);

    expect(matches).toHaveLength(1);
    expect(matches[0].lineIndex).toBe(0);
    expect(matches[0].indentation).toBe('  ');
  });

  it('should handle mixed newlines CRLF and LF', () => {
    const source = 'line1\r\n  line2\r\nline3';
    const target = 'line2';
    const matches = ResilientBlockMatcher.findMatches(source, target);

    expect(matches).toHaveLength(1);
    expect(matches[0].lineIndex).toBe(1);
    expect(matches[0].indentation).toBe('  ');
  });

  it('should prevent overlapping matches', () => {
    const source = 'a\na\na\na';
    const target = 'a\na';
    const matches = ResilientBlockMatcher.findMatches(source, target);

    // Non-overlapping means matching [0, 1] and [2, 3] -> 2 matches total
    expect(matches).toHaveLength(2);
    expect(matches[0].lineIndex).toBe(0);
    expect(matches[1].lineIndex).toBe(2);
  });

  it('should return empty matches for empty target block', () => {
    const source = 'some content';
    expect(ResilientBlockMatcher.findMatches(source, '')).toHaveLength(0);
    expect(ResilientBlockMatcher.findMatches(source, '\n')).toHaveLength(0);
  });
});
