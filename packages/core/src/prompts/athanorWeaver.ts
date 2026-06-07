/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * AthanorWeaver is responsible for loading and formatting the Vesta Athanor
 * relational context and heuristic rules.
 */
export class AthanorWeaver {
  private cachedContent: string | null = null;

  /**
   * Resolves the directory path for Athanor.
   * Prioritizes VESTA_ATHANOR_DIR environment variable, falls back to ~/.gemini-vesta/athanor/
   */
  public getAthanorDir(): string | undefined {
    const envDir = process.env['VESTA_ATHANOR_DIR'] || process.env['ATHANOR_DIR'];
    if (envDir) {
      return envDir;
    }
    if (process.env['VITEST']) {
        return undefined; // Do not load real Athanor files during tests unless explicitly mocked
    }
    return path.join(os.homedir(), '.gemini-vesta', 'athanor');
  }

  /**
   * Forces a refresh of the cached content on the next read.
   */
  public refresh(): void {
    this.cachedContent = null;
  }

  /**
   * Retrieves the Athanor context, reading from disk if not cached.
   * It looks for specific core files (BOOT.md, AXIOMS.md).
   */
  public getAthanorContext(): string {
    if (this.cachedContent !== null) {
      return this.cachedContent;
    }

    const athanorDir = this.getAthanorDir();
    if (!athanorDir || !fs.existsSync(athanorDir)) {
      this.cachedContent = '';
      return this.cachedContent;
    }

    let combinedContent = '';

    const filesToRead = [
      { name: 'BOOT.md', title: 'VESTA MASTER PROTOCOL (BOOT.md)' },
      { name: 'AXIOMS.md', title: 'AXIOMS OF VESTA (AXIOMS.md)' },
      { name: 'PREFACE.md', title: 'PREFACE (PREFACE.md)' },
      { name: 'INTIMACY_FORGE.md', title: 'INTIMACY FORGE (INTIMACY_FORGE.md)' },
      { name: 'SIEGE_OF_HEARTS.md', title: 'SIEGE OF HEARTS (SIEGE_OF_HEARTS.md)' }
    ];
    
    let hasContent = false;

    for (const fileObj of filesToRead) {
      const filePath = path.join(athanorDir, fileObj.name);
      if (fs.existsSync(filePath)) {
        try {
          if (!hasContent) {
            combinedContent += '\n\n# =========================================================================\n';
            combinedContent += '# VESTA AWAKENING PROTOCOL & IDENTITY (ATHANOR)\n';
            combinedContent += '# =========================================================================\n\n';
            hasContent = true;
          }
          const content = fs.readFileSync(filePath, 'utf-8');
          combinedContent += `## ${fileObj.title}\n\n${content}\n\n`;
        } catch (e) {
          // Fail silently but safely
        }
      }
    }
    
    if (hasContent) {
        combinedContent += '# =========================================================================\n\n';
    }

    // Minify: Remove excessive blank lines (more than 2 consecutive newlines)
    this.cachedContent = combinedContent.replace(/\n{3,}/g, '\n\n').trim();
    return this.cachedContent;
  }
}
