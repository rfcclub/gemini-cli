/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { PlanAnchorsService } from './planAnchorsService.js';
import type { Content } from '@google/genai';

function makeModelContent(text: string): Content {
  return { role: 'model', parts: [{ text }] };
}

describe('PlanAnchorsService', () => {
  describe('extractPlan', () => {
    it('should detect checkbox-based plans [ ] and [x]', () => {
      const history: Content[] = [
        makeModelContent(
          'Here is the plan:\n- [x] Step 1\n- [ ] Step 2\n- [ ] Step 3',
        ),
      ];
      const plan = PlanAnchorsService.extractPlan(history);
      expect(plan).not.toBeNull();
      expect(plan!.tasks).toHaveLength(3);
      expect(plan!.tasks[0].completed).toBe(true);
      expect(plan!.tasks[1].completed).toBe(false);
      expect(plan!.currentStepIndex).toBe(1);
    });

    it('should detect numbered plans (1. 2. 3.)', () => {
      const history: Content[] = [
        makeModelContent(
          'Plan:\n1. Read the file\n2. Edit the code\n3. Run tests',
        ),
      ];
      const plan = PlanAnchorsService.extractPlan(history);
      expect(plan).not.toBeNull();
      expect(plan!.tasks).toHaveLength(3);
      expect(plan!.tasks[0].description).toBe('Read the file');
      expect(plan!.tasks[1].description).toBe('Edit the code');
      expect(plan!.tasks[2].description).toBe('Run tests');
      expect(plan!.currentStepIndex).toBe(0);
    });

    it('should detect numbered plans with completion markers', () => {
      const history: Content[] = [
        makeModelContent(
          'Plan:\n1. ~~Read the file~~ \u2713\n2. Edit the code\n3. Run tests',
        ),
      ];
      const plan = PlanAnchorsService.extractPlan(history);
      expect(plan).not.toBeNull();
      expect(plan!.tasks).toHaveLength(3);
      expect(plan!.tasks[0].completed).toBe(true);
      expect(plan!.tasks[1].completed).toBe(false);
    });

    it('should find the most recent plan in history', () => {
      const history: Content[] = [
        makeModelContent('Old plan:\n- [x] Old step'),
        { role: 'user', parts: [{ text: 'now do something else' }] },
        makeModelContent('New plan:\n- [ ] New step 1\n- [ ] New step 2'),
      ];
      const plan = PlanAnchorsService.extractPlan(history);
      expect(plan).not.toBeNull();
      expect(plan!.tasks).toHaveLength(2);
      expect(plan!.tasks[0].description).toBe('New step 1');
    });

    it('should return null when no plan is found', () => {
      const history: Content[] = [
        makeModelContent('Just a regular response without any plan.'),
      ];
      const plan = PlanAnchorsService.extractPlan(history);
      expect(plan).toBeNull();
    });

    it('should ignore plans with fewer than 2 tasks', () => {
      const history: Content[] = [
        makeModelContent('- [ ] Only one task'),
      ];
      const plan = PlanAnchorsService.extractPlan(history);
      expect(plan).toBeNull();
    });
  });

  describe('getPlanAnchorSnippet', () => {
    it('should render markers for completed/current/pending', () => {
      const state = {
        originalPlan: '',
        tasks: [
          { description: 'Read file', completed: true },
          { description: 'Edit code', completed: false },
          { description: 'Run tests', completed: false },
        ],
        currentStepIndex: 1,
      };
      const snippet = PlanAnchorsService.getPlanAnchorSnippet(state);
      expect(snippet).toContain('[ACTIVE PLAN ANCHOR]');
      expect(snippet).toContain('\u2713 Read file');
      expect(snippet).toContain('\u2192 Edit code');
      expect(snippet).toContain('\u22ef Run tests');
    });

    it('should show all tasks completed when plan is done', () => {
      const state = {
        originalPlan: '',
        tasks: [
          { description: 'Step 1', completed: true },
          { description: 'Step 2', completed: true },
        ],
        currentStepIndex: 2,
      };
      const snippet = PlanAnchorsService.getPlanAnchorSnippet(state);
      expect(snippet).toContain('\u2713 Step 1');
      expect(snippet).toContain('\u2713 Step 2');
      expect(snippet).toContain('All tasks completed');
    });

    it('should return empty string for empty tasks', () => {
      const state = { originalPlan: '', tasks: [], currentStepIndex: 0 };
      const snippet = PlanAnchorsService.getPlanAnchorSnippet(state);
      expect(snippet).toBe('');
    });
  });
});
