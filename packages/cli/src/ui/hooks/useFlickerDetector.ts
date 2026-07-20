/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { type DOMElement, measureElement } from 'ink';
import { useEffect } from 'react';
import { useConfig } from '../contexts/ConfigContext.js';
import { recordFlickerFrame } from '@google/gemini-cli-core';
import { appEvents, AppEvent } from '../../utils/events.js';
import { useUIState } from '../contexts/UIStateContext.js';

/**
 * A hook that detects when the UI flickers (renders taller than the terminal).
 * This is a sign of a rendering bug that should be fixed.
 *
 * @param rootUiRef A ref to the root UI element.
 * @param terminalHeight The height of the terminal.
 */
export function useFlickerDetector(
  rootUiRef: React.RefObject<DOMElement | null>,
  terminalHeight: number,
) {
  const config = useConfig();
  const { constrainHeight } = useUIState();

  // eslint-disable-next-line no-console
  console.log('Hook executed. ref:', !!rootUiRef.current);
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('Effect executed.');
    const runMeasurement = () => {
      // eslint-disable-next-line no-console
      console.log('runMeasurement called. current:', !!rootUiRef.current);
      if (!rootUiRef.current) return;
      const measurement = measureElement(rootUiRef.current);
      // eslint-disable-next-line no-console
      console.log('measurement:', measurement, 'terminalHeight:', terminalHeight);
      if (measurement.height > terminalHeight) {
        if (!constrainHeight) {
          // eslint-disable-next-line no-console
          console.log('not constrainHeight');
          return;
        }

        // eslint-disable-next-line no-console
        console.log('Recording flicker frame!');
        recordFlickerFrame(config);
        appEvents.emit(AppEvent.Flicker);
      }
    };

    if (typeof process !== 'undefined' && process.env['NODE_ENV'] === 'test') {
      runMeasurement();
      return;
    }

    const timer = setTimeout(runMeasurement, 500);
    return () => clearTimeout(timer);
  });
}
