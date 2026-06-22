/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Text } from 'ink';
import { isVestaEnv , vestaMiniFlameFrames } from './AsciiArt.js';
import { useFlameAnimation } from '../hooks/useFlameAnimation.js';
import { useSettings } from '../contexts/SettingsContext.js';

/**
 * Mini flame icon for the footer. Pulses through the Vesta fire palette
 * every ~800ms (1.5 fps × 4 frames ≈ 2.7s full cycle).
 *
 * - Returns `null` outside Vesta mode (Gemini mode sees no extra pixel).
 * - Returns a static fire emoji when the user has screen-reader mode on.
 * - Otherwise renders the current frame from `vestaMiniFlameFrames` with
 *   the frame's paired color.
 */
export const VestaFlameIndicator: React.FC = () => {
  // Hooks first — Rules of Hooks requires unconditional, stable order.
  const settings = useSettings();
  const frameIndex = useFlameAnimation(vestaMiniFlameFrames.length, {
    fps: 1.5,
    enabled: isVestaEnv(),
  });

  if (!isVestaEnv()) {
    return null;
  }

  const screenReader = settings.merged.ui?.accessibility?.screenReader === true;
  if (screenReader) {
    return <Text color="#FF8C00">🔥 </Text>;
  }

  const [chars, color] = vestaMiniFlameFrames[frameIndex];

  return <Text color={color}>{chars} </Text>;
};
