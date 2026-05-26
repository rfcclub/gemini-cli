/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CommandModule } from 'yargs';
import { render } from 'ink';
import { TelemetryStore } from '@google/gemini-cli-core';
import { VestaDashboardView } from '../ui/components/VestaDashboardView.js';
import { exitCli } from './utils.js';
import { initializeOutputListenersAndFlush } from '../gemini.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import chalk from 'chalk';

export const statsCommand: CommandModule = {
  command: 'stats',
  describe: 'Show real-time Vesta Athanor optimization & cost savings analytics.',
  builder: (yargs) =>
    yargs
      .option('clear', {
        type: 'boolean',
        description: 'Clear all session telemetry files.',
        default: false,
      })
      .middleware((argv) => {
        initializeOutputListenersAndFlush();
        argv['isCommand'] = true;
      })
      .version(false),
  handler: async (argv) => {
    const store = new TelemetryStore();

    if (argv['clear']) {
      const dir = os.tmpdir();
      const prefix = 'gemini-vesta-telemetry-';
      const suffix = '.json';
      let clearedCount = 0;
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.startsWith(prefix) && file.endsWith(suffix)) {
            const filepath = path.join(dir, file);
            fs.unlinkSync(filepath);
            clearedCount++;
          }
        }
      } catch (e) {
        // Ignore errors
      }
      process.stdout.write(chalk.green(`Successfully cleared ${clearedCount} telemetry session files.\n`));
      await exitCli(0);
      return;
    }

    const { stats } = store.getCumulativeStats();
    const savings = store.calculateSavings(stats);

    const instance = render(<VestaDashboardView stats={stats} savings={savings} />);
    
    // Wait for a tiny tick to ensure render is complete
    await new Promise((resolve) => setTimeout(resolve, 50));
    instance.unmount();
    await exitCli(0);
  },
};
