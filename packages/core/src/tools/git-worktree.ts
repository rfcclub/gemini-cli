/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { execSync } from 'node:child_process';
import path from 'node:path';
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

const TOOL_NAME = 'git_worktree';
const TOOL_DISPLAY_NAME = 'Git Worktree';

interface GitWorktreeParams {
  action: 'list' | 'add' | 'remove';
  path?: string;
  branch?: string;
  create_branch?: boolean;
}

class GitWorktreeInvocation extends BaseToolInvocation<
  GitWorktreeParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: GitWorktreeParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ) {
    super(params, messageBus, _toolName, _toolDisplayName);
  }

  getDescription(): string {
    switch (this.params.action) {
      case 'list':
        return 'List git worktrees';
      case 'add':
        return `Add git worktree at ${this.params.path || '?'}`;
      case 'remove':
        return `Remove git worktree at ${this.params.path || '?'}`;
    }
  }

  private execGit(args: string[]): string {
    const cwd = this.config.getTargetDir();
    try {
      return execSync(`git ${args.join(' ')}`, {
        cwd,
        encoding: 'utf-8',
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`git worktree command failed: ${msg}`);
    }
  }

  async execute(_options: ExecuteOptions): Promise<ToolResult> {
    try {
      switch (this.params.action) {
        case 'list': {
          const output = this.execGit(['worktree', 'list', '--porcelain']);
          return {
            llmContent: output || 'No worktrees found.',
            returnDisplay: output || 'No worktrees found.',
          };
        }

        case 'add': {
          if (!this.params.path) {
            return {
              llmContent: 'Error: path is required for add action',
              returnDisplay: 'Error: path is required',
              error: {
                message: 'path is required for add action',
                type: ToolErrorType.INVALID_TOOL_PARAMS,
              },
            };
          }
          const args = ['worktree', 'add'];
          if (this.params.create_branch) {
            args.push(
              '-b',
              this.params.branch || path.basename(this.params.path),
            );
            args.push(this.params.path);
          } else if (this.params.branch) {
            args.push(this.params.path, this.params.branch);
          } else {
            args.push(this.params.path);
          }
          const output = this.execGit(args);
          return {
            llmContent: `Worktree added at ${this.params.path}\n${output}`,
            returnDisplay: `Worktree added at ${this.params.path}`,
          };
        }

        case 'remove': {
          if (!this.params.path) {
            return {
              llmContent: 'Error: path is required for remove action',
              returnDisplay: 'Error: path is required',
              error: {
                message: 'path is required for remove action',
                type: ToolErrorType.INVALID_TOOL_PARAMS,
              },
            };
          }
          const output = this.execGit([
            'worktree',
            'remove',
            this.params.path,
          ]);
          return {
            llmContent: `Worktree removed: ${this.params.path}\n${output}`,
            returnDisplay: `Worktree removed: ${this.params.path}`,
          };
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        llmContent: `Error: ${msg}`,
        returnDisplay: `Error: ${msg}`,
        error: {
          message: msg,
          type: ToolErrorType.EXECUTION_FAILED,
        },
      };
    }
  }
}

export class GitWorktreeTool extends BaseDeclarativeTool<
  GitWorktreeParams,
  ToolResult
> {
  static readonly Name = TOOL_NAME;

  constructor(
    private config: Config,
    messageBus: MessageBus,
  ) {
    super(
      GitWorktreeTool.Name,
      TOOL_DISPLAY_NAME,
      'Manage git worktrees for parallel development. Supports list, add, remove operations.',
      Kind.Read,
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'add', 'remove'],
            description:
              'The operation: list (show all worktrees), add (create new worktree), remove (delete worktree)',
          },
          path: {
            type: 'string',
            description:
              'For add: path for new worktree. For remove: path of worktree to remove.',
          },
          branch: {
            type: 'string',
            description:
              "For add: branch name to checkout (optional, creates new if doesn't exist)",
          },
          create_branch: {
            type: 'boolean',
            description:
              'For add: create a new branch instead of checking out existing',
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
    params: GitWorktreeParams,
    messageBus: MessageBus,
    _toolName?: string,
    _toolDisplayName?: string,
  ): ToolInvocation<GitWorktreeParams, ToolResult> {
    return new GitWorktreeInvocation(
      this.config,
      params,
      messageBus,
      _toolName,
      _toolDisplayName,
    );
  }
}
