/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Text, useIsScreenReaderEnabled } from 'ink';
import type { SpinnerName } from 'cli-spinners';
import { useStreamingContext } from '../contexts/StreamingContext.js';
import { StreamingState } from '../types.js';
import {
  SCREEN_READER_LOADING,
  SCREEN_READER_RESPONDING,
} from '../textConstants.js';
import { theme } from '../semantic-colors.js';
import { CliSpinner } from './CliSpinner.js';

interface VestaFlameSpinnerProps {
  /**
   * Optional string to display when not in Responding state.
   * If not provided and not Responding, renders null.
   */
  nonRespondingDisplay?: string;
  spinnerType?: SpinnerName;
  /**
   * If true, we prioritize showing the nonRespondingDisplay (hook icon)
   * even if the state is Responding.
   */
  isHookActive?: boolean;
}

/**
 * Drop-in replacement for `GeminiRespondingSpinner` in Vesta mode.
 *
 * Historically rendered a multi-frame flame glyph; that was removed because
 * the animation was firing on every keystroke and causing the "ỳ xèo"
 * flicker. Now it delegates to the standard Ink `<Spinner>` (dots) so the
 * streaming state still has a visible affordance without re-painting the
 * whole terminal.
 *
 * In screen-reader mode we render the same `SCREEN_READER_*` strings the
 * Gemini spinner uses, so a11y output is unchanged.
 */
export const VestaFlameSpinner: React.FC<VestaFlameSpinnerProps> = ({
  nonRespondingDisplay,
  spinnerType = 'dots',
  isHookActive = false,
}) => {
  // Hooks first (Rules of Hooks) — order must stay stable.
  const streamingState = useStreamingContext();
  const isScreenReaderEnabled = useIsScreenReaderEnabled();

  if (isScreenReaderEnabled) {
    if (streamingState === StreamingState.Responding && !isHookActive) {
      return <Text>{SCREEN_READER_RESPONDING}</Text>;
    }
    if (nonRespondingDisplay) {
      return <Text>{SCREEN_READER_LOADING}</Text>;
    }
    return null;
  }

  if (streamingState === StreamingState.Responding && !isHookActive) {
    return <CliSpinner type={spinnerType} />;
  }

  if (nonRespondingDisplay) {
    return <Text color={theme.text.primary}>{nonRespondingDisplay}</Text>;
  }

  return null;
};
