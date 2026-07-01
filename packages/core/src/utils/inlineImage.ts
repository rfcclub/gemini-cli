/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { debugLogger } from './debugLogger.js';

/**
 * Terminal image rendering protocols.
 */
export type ImageProtocol = 'iterm2' | 'kitty' | 'none';

/**
 * Detects which image protocol the current terminal supports.
 * Checks TERM_PROGRAM and terminal name for known terminals.
 */
export function detectImageProtocol(): ImageProtocol {
  const termProgram = (process.env['TERM_PROGRAM'] || '').toLowerCase();
  const term = (process.env['TERM'] || '').toLowerCase();

  // iTerm2
  if (termProgram.includes('iterm') || term.includes('iterm')) {
    return 'iterm2';
  }

  // Kitty
  if (termProgram.includes('kitty') || term.includes('kitty')) {
    return 'kitty';
  }

  // Ghostty (supports iTerm2 protocol)
  if (termProgram.includes('ghostty')) {
    return 'iterm2';
  }

  // WezTerm (supports iTerm2 protocol)
  if (termProgram.includes('wezterm')) {
    return 'iterm2';
  }

  // VS Code terminal (no image support)
  if (termProgram.includes('vscode')) {
    return 'none';
  }

  // tmux/screen (passthrough may work but unreliable)
  if (process.env['TMUX'] || process.env['STY']) {
    return 'none';
  }

  return 'none';
}

/**
 * Options for rendering an image inline in the terminal.
 */
export interface InlineImageOptions {
  /** Maximum width in columns (default: 40) */
  maxWidth?: number;
  /** Maximum height in rows (default: 20) */
  maxHeight?: number;
  /** Whether to show filename below the image */
  showFilename?: boolean;
}

/**
 * Renders an image inline in the terminal using the appropriate protocol.
 * Returns the escape sequence string to write to stdout.
 *
 * @param filePath Path to the image file
 * @param options Rendering options
 * @returns Escape sequence string, or null if protocol not supported
 */
export function renderInlineImage(
  filePath: string,
  options: InlineImageOptions = {},
): string | null {
  const protocol = detectImageProtocol();
  const { maxWidth = 40, maxHeight = 20, showFilename = true } = options;

  if (protocol === 'none') {
    return null;
  }

  try {
    const imageData = fs.readFileSync(filePath);
    const base64 = imageData.toString('base64');
    const filename = path.basename(filePath);

    let sequence = '';

    if (protocol === 'iterm2') {
      // iTerm2 Inline Images Protocol
      // ESC ] 1337 ; File = [args] ; base64data BEL
      const args = [
        `size=${imageData.length}`,
        `width=${maxWidth}`,
        `height=${maxHeight}`,
        'preserveAspectRatio=1',
        'inline=1',
      ].join(';');
      sequence = `\x1b]1337;File=${args}:${base64}\x07`;
    } else if (protocol === 'kitty') {
      // Kitty Graphics Protocol
      // ESC _ G ; [args] ; base64data ESC \
      const args = [
        'a=T', // action: transmit and display
        't=d', // transmission: direct
        `f=100`, // format: PNG (100)
        `s=${imageData.length}`, // data size
        `c=${maxWidth}`, // columns
        `r=${maxHeight}`, // rows
      ].join(',');
      // Kitty requires chunked transmission for large images
      const chunkSize = 4096;
      const chunks: string[] = [];
      for (let i = 0; i < base64.length; i += chunkSize) {
        const chunk = base64.slice(i, i + chunkSize);
        if (i === 0) {
          chunks.push(`\x1b_G${args};${chunk}\x1b\\`);
        } else {
          chunks.push(`\x1b_Gm=1;${chunk}\x1b\\`);
        }
      }
      sequence = chunks.join('');
    }

    // Add filename if requested
    if (showFilename && filename) {
      sequence += `\n${filename}`;
    }

    return sequence;
  } catch (e) {
    debugLogger.warn(`Failed to render inline image ${filePath}:`, e);
    return null;
  }
}

/**
 * Checks if the current terminal supports inline image rendering.
 */
export function supportsInlineImages(): boolean {
  return detectImageProtocol() !== 'none';
}
