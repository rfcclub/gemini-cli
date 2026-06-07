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

/**
 * Service to detect, track and re-inject multi-step plans into the session context.
 * This is the core of the "Plan Anchors" feature in Cognition Adapter.
 */
export class PlanAnchorsService {
  /**
   * Attempts to extract a plan from the chat history.
   * Looks for task lists with checkboxes [ ] or [x].
   */
  static extractPlan(history: Content[]): PlanState | null {
    // Traverse history backwards to find the latest plan
    for (let i = history.length - 1; i >= 0; i--) {
      const parts = history[i].parts;
      if (!parts) continue;
      const content = partListUnionToString(parts);
      if (content.includes('[ ]') || content.includes('[x]')) {
        const lines = content.split('\n');
        const tasks = lines
          .filter(l => l.includes('[ ]') || l.includes('[x]'))
          .map(l => ({
            description: l.replace(/^[-\s]*\[[ x]\]\s*/, '').trim(),
            completed: l.includes('[x]')
          }));

        if (tasks.length > 0) {
          const currentStepIndex = tasks.findIndex(t => !t.completed);
          return {
            originalPlan: content,
            tasks,
            currentStepIndex: currentStepIndex === -1 ? tasks.length : currentStepIndex
          };
        }
      }
    }
    return null;
  }

  /**
   * Generates a "Plan Anchor" snippet to be injected into the system prompt.
   */
  static getPlanAnchorSnippet(state: PlanState): string {
    if (!state || state.tasks.length === 0) return '';

    const progress = `Progress: ${state.tasks.filter(t => t.completed).length}/${state.tasks.length} tasks completed.`;
    const nextTask = state.currentStepIndex < state.tasks.length 
      ? `Next Task: ${state.tasks[state.currentStepIndex].description}`
      : 'All tasks completed.';

    return `
---
[ACTIVE PLAN ANCHOR]
${progress}
${nextTask}
Focus on completing the current plan without getting distracted by side-tasks.
---
`;
  }
}
