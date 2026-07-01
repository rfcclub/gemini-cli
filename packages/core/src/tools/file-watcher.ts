/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MessageBus } from '../confirmation-bus/message-bus.js';
import fs from 'node:fs';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
  type ToolInvocation,
  type ToolResult,
  type ExecuteOptions,
} from './tools.js';
import { type Config } from '../config/config.js';
import { ToolErrorType } from './tool-error.js';

const TOOL_NAME = 'file_watcher';
const TOOL_DISPLAY_NAME = 'File Watcher';

interface FileWatcherParams {
  action: 'start' | 'stop' | 'status';
  duration?: number;
}

let activeWatcher: fs.FSWatcher | null = null;
let watcherChanges: string[] = [];
let watcherStartTime = 0;

class FileWatcherInvocation extends BaseToolInvocation<
  FileWatcherParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: FileWatcherParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    switch (this.params.action) {
      case 'start':
        return `Start watching files for ${this.params.duration || 60}s`;
      case 'stop':
        return 'Stop file watcher';
      case 'status':
        return 'Check file watcher status';
    }
  }

  async execute(_options: ExecuteOptions): Promise<ToolResult> {
    const cwd = this.config.getTargetDir();

    switch (this.params.action) {
      case 'start': {
        if (activeWatcher) {
          return {
            llmContent: 'File watcher is already running. Stop it first.',
            returnDisplay: 'Watcher already running',
          };
        }

        const duration = this.params.duration || 60;
        watcherChanges = [];
        watcherStartTime = Date.now();

        try {
          activeWatcher = fs.watch(
            cwd,
            { recursive: true },
            (eventType, filename) => {
              if (filename) {
                const timestamp = new Date().toISOString();
                watcherChanges.push(
                  `[${timestamp}] ${eventType}: ${filename}`,
                );
              }
            },
          );

          setTimeout(() => {
            if (activeWatcher) {
              activeWatcher.close();
              activeWatcher = null;
            }
          }, duration * 1000);

          return {
            llmContent: `File watcher started for ${duration}s in ${cwd}. Use action=status to check, action=stop to stop and report.`,
            returnDisplay: `Watching ${cwd} for ${duration}s`,
          };
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          return {
            llmContent: `Error starting watcher: ${msg}`,
            returnDisplay: `Error: ${msg}`,
            error: { message: msg, type: ToolErrorType.EXECUTION_FAILED },
          };
        }
      }

      case 'stop': {
        if (!activeWatcher) {
          return {
            llmContent: 'No file watcher is running.',
            returnDisplay: 'No watcher running',
          };
        }

        activeWatcher.close();
        activeWatcher = null;
        const elapsed = Math.round((Date.now() - watcherStartTime) / 1000);
        const changes = watcherChanges.length;

        return {
          llmContent:
            `File watcher stopped after ${elapsed}s.\n` +
            `Changes detected: ${changes}\n` +
            (changes > 0
              ? '\nRecent changes:\n' + watcherChanges.slice(-20).join('\n')
              : ''),
          returnDisplay: `Watcher stopped: ${changes} changes in ${elapsed}s`,
        };
      }

      case 'status': {
        if (!activeWatcher) {
          return {
            llmContent: 'No file watcher is running.',
            returnDisplay: 'No watcher running',
          };
        }

        const elapsed = Math.round((Date.now() - watcherStartTime) / 1000);
        return {
          llmContent:
            `File watcher is running (${elapsed}s elapsed).\n` +
            `Changes detected so far: ${watcherChanges.length}` +
            (watcherChanges.length > 0
              ? '\nRecent changes:\n' + watcherChanges.slice(-10).join('\n')
              : ''),
          returnDisplay: `Watching: ${watcherChanges.length} changes in ${elapsed}s`,
        };
      }
    }
  }
}

export class FileWatcherTool extends BaseDeclarativeTool<
  FileWatcherParams,
  ToolResult
> {
  static readonly Name = TOOL_NAME;

  constructor(
    private config: Config,
    messageBus: MessageBus,
  ) {
    super(
      FileWatcherTool.Name,
      TOOL_DISPLAY_NAME,
      'Watch files for changes in the project directory. Useful for monitoring file modifications during development.',
      Kind.Read,
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['start', 'stop', 'status'],
            description:
              'The operation: start (begin watching), stop (stop and report changes), status (check current watcher)',
          },
          duration: {
            type: 'number',
            description:
              'Duration in seconds to watch (optional, defaults to 60)',
          },
        },
        required: ['action'],
      },
      messageBus,
      true,
      false,
    );
  }

  protected createInvocation(
    params: FileWatcherParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<FileWatcherParams, ToolResult> {
    return new FileWatcherInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
