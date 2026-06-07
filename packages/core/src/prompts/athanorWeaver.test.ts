/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { AthanorWeaver } from './athanorWeaver.js';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe('AthanorWeaver', () => {
  let weaver: AthanorWeaver;

  beforeEach(() => {
    vi.resetAllMocks();
    weaver = new AthanorWeaver();
    vi.stubEnv('VESTA_ATHANOR_DIR', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Directory Resolution', () => {
    it('uses VESTA_ATHANOR_DIR if set', () => {
      const customPath = '/custom/athanor/path';
      vi.stubEnv('VESTA_ATHANOR_DIR', customPath);
      expect(weaver.getAthanorDir()).toBe(customPath);
    });

    it('falls back to ~/.gemini-vesta/athanor/ if env var is not set', () => {
      vi.stubEnv('VITEST', ''); // remove VITEST flag to test real fallback
      const expectedPath = path.join(os.homedir(), '.gemini-vesta', 'athanor');
      expect(weaver.getAthanorDir()).toBe(expectedPath);
    });
  });

  describe('Reading and Caching', () => {
    const mockDir = '/mock/athanor';

    beforeEach(() => {
      vi.stubEnv('VESTA_ATHANOR_DIR', mockDir);
    });

    it('returns empty string if directory does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(weaver.getAthanorContext()).toBe('');
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    it('reads BOOT.md and AXIOMS.md if they exist', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (p === mockDir) return true;
        if (p === path.join(mockDir, 'BOOT.md')) return true;
        if (p === path.join(mockDir, 'AXIOMS.md')) return true;
        return false;
      });

      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        if (p === path.join(mockDir, 'BOOT.md')) return '# BOOT\nIdentity';
        if (p === path.join(mockDir, 'AXIOMS.md')) return '# AXIOMS\nRules';
        return '';
      });

      const context = weaver.getAthanorContext();
      expect(context).toContain('# BOOT');
      expect(context).toContain('Identity');
      expect(context).toContain('# AXIOMS');
      expect(context).toContain('Rules');
      
      expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    });

    it('caches the result and avoids repeated disk reads', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('mock content');

      weaver.getAthanorContext();
      weaver.getAthanorContext();
      weaver.getAthanorContext();

      expect(fs.readFileSync).toHaveBeenCalledTimes(5); // 5 files to read
    });

    it('refresh() clears the cache', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('mock content');

      weaver.getAthanorContext(); // initial read
      weaver.refresh();
      weaver.getAthanorContext(); // reads again

      expect(fs.readFileSync).toHaveBeenCalledTimes(10); // 5 files * 2 reads
    });

    it('minifies the output by removing excessive blank lines', () => {
       vi.mocked(fs.existsSync).mockReturnValue(true);
       vi.mocked(fs.readFileSync).mockImplementation((p) => {
         if (p.toString().endsWith('BOOT.md')) return 'Line 1\n\n\n\nLine 2';
         return '';
       });

       const context = weaver.getAthanorContext();
       expect(context).not.toContain('\n\n\n');
       expect(context).toContain('Line 1\n\nLine 2');
    });
  });
});
