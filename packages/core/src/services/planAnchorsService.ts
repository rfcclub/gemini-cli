/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { type Content } from '@google/genai';
import { partListUnionToString } from '../core/geminiRequest.js';

export interface PlanState {
  originalPlan: string;
  tasks: Array<{
    description: string;
    completed: boolean;
  }>;
  currentStepIndex: number;
}

const CHECKBOX_RE = /^\s*[-*]?\s*\[([ xX])\]\s*(.+)$/;
const NUMBERED_RE = /^\s*(\d+)\.\s*(.+)$/;
const STRIKE_RE = /~~(.+?)~~/;
const CHECKMARK_RE = /[\u2713\u2714]/;
const NL = String.fromCharCode(10);

export class PlanAnchorsService {
  static extractPlan(history: Content[]): PlanState | null {
    for (let i = history.length - 1; i >= 0; i--) {
      const parts = history[i]?.parts;
      if (!parts) continue;
      const content = partListUnionToString(parts);
      let tasks = PlanAnchorsService.parseCheckboxPlan(content);
      if (!tasks || tasks.length < 2) {
        tasks = PlanAnchorsService.parseNumberedPlan(content);
      }
      if (tasks && tasks.length >= 2) {
        const currentStepIndex = tasks.findIndex((t) => !t.completed);
        return {
          originalPlan: content,
          tasks,
          currentStepIndex:
            currentStepIndex === -1 ? tasks.length : currentStepIndex,
        };
      }
    }
    return null;
  }

  private static parseCheckboxPlan(
    content: string,
  ): Array<{ description: string; completed: boolean }> | null {
    const lines = content.split(NL);
    const tasks: Array<{ description: string; completed: boolean }> = [];
    for (const line of lines) {
      const match = line.match(CHECKBOX_RE);
      if (match) {
        const completed = match[1]!.toLowerCase() === 'x';
        const description = match[2]!.trim();
        if (description) tasks.push({ description, completed });
      }
    }
    return tasks.length >= 2 ? tasks : null;
  }

  private static parseNumberedPlan(
    content: string,
  ): Array<{ description: string; completed: boolean }> | null {
    const lines = content.split(NL);
    const tasks: Array<{ description: string; completed: boolean }> = [];
    for (const line of lines) {
      const match = line.match(NUMBERED_RE);
      if (match) {
        let description = match[2]!.trim();
        let completed = false;
        const strikeMatch = description.match(STRIKE_RE);
        if (strikeMatch) {
          completed = true;
          description = description.replace(STRIKE_RE, strikeMatch[1]!).trim();
        }
        if (CHECKMARK_RE.test(description)) {
          completed = true;
          description = description.replace(CHECKMARK_RE, '').trim();
        }
        if (description) tasks.push({ description, completed });
      }
    }
    return tasks.length >= 2 ? tasks : null;
  }

  static getPlanAnchorSnippet(state: PlanState): string {
    if (!state || state.tasks.length === 0) return '';
    const completedCount = state.tasks.filter((t) => t.completed).length;
    const progress = "Progress: " + completedCount + "/" + state.tasks.length + " tasks completed.";
    const taskLines = state.tasks.map((task, index) => {
      if (task.completed) return "  \u2713 " + task.description;
      if (index === state.currentStepIndex) return "  \u2192 " + task.description;
      return "  \u22ef " + task.description;
    });
    const status = state.currentStepIndex < state.tasks.length
      ? "Next Task: " + state.tasks[state.currentStepIndex]!.description
      : "All tasks completed.";
    return [
      "", "---", "[ACTIVE PLAN ANCHOR]", progress, status, "",
      taskLines.join(NL), "",
      "Focus on completing the current plan without getting distracted by side-tasks.",
      "---", "",
    ].join(NL);
  }
}
