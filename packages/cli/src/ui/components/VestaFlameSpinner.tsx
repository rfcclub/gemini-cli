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
import { vestaFlameFrames } from './AsciiArt.js';
import { useFlameAnimation } from '../hooks/useFlameAnimation.js';

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
  color?: string;
}

/**
 * Drop-in replacement for `GeminiRespondingSpinner` in Vesta mode. Cycles
 * through `vestaFlameFrames` at ~12 fps while the streaming state is
 * `Responding`. In screen-reader mode we render the same `SCREEN_READER_*`
 * strings the Gemini spinner uses, so a11y output is unchanged.
 */
export const VestaFlameSpinner: React.FC<VestaFlameSpinnerProps> = ({
  nonRespondingDisplay,
  spinnerType: _spinnerType = 'dots',
  isHookActive = false,
  color: _color,
}) => {
  // Hooks first (Rules of Hooks) — the value of frame is only used when
  // we actually render the flame, but the hook itself must be called on
  // every render in stable order.
  const streamingState = useStreamingContext();
  const isScreenReaderEnabled = useIsScreenReaderEnabled();
  const flameFrame = useFlameAnimation(vestaFlameFrames.length, { fps: 12 });

  if (
    streamingState === StreamingState.Responding &&
    !isHookActive &&
    !isScreenReaderEnabled
  ) {
    const frame = vestaFlameFrames[flameFrame];
    return (
      <Text>
        {frame.rows.flatMap((row, i) => [
          <Text key={i} color={frame.colors[i]}>
            {row}
          </Text>,
          i < frame.rows.length - 1 ? '\n' : '',
        ])}
      </Text>
    );
  }

  if (isScreenReaderEnabled) {
    if (streamingState === StreamingState.Responding && !isHookActive) {
      return <Text>{SCREEN_READER_RESPONDING}</Text>;
    }
    if (nonRespondingDisplay) {
      return <Text>{SCREEN_READER_LOADING}</Text>;
    }
    return null;
  }

  if (nonRespondingDisplay) {
    return <Text color={theme.text.primary}>{nonRespondingDisplay}</Text>;
  }

  return null;
};
