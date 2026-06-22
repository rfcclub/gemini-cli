/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useEffect } from 'react';
import { Box, Text, useIsScreenReaderEnabled } from 'ink';
import {
  isVestaEnv,
  vestaFlameFrames,
  FIRE_PALETTE,
  shortAsciiLogo,
} from './AsciiArt.js';
import { useFlameAnimation } from '../hooks/useFlameAnimation.js';
import { useSettings } from '../contexts/SettingsContext.js';
import { useKeypress } from '../hooks/useKeypress.js';

interface VestaSplashProps {
  /**
   * If false, splash renders nothing and skips all timers. Parent owns
   * the visible state.
   */
  visible: boolean;
  onDismiss: () => void;
  /** Auto-dismiss after this many ms. Default 1500. */
  durationMs?: number;
}

const TAGLINE = 'The Athanor is hot. Vesta is ready.';

/**
 * Boot splash for Vesta mode. Renders the short Vesta logo + tagline with
 * a 4-frame flame animation cycling next to it. Auto-dismisses after
 * `durationMs` (default 1500) or on any keypress.
 *
 * - Returns `null` outside Vesta mode (zero pixel in Gemini).
 * - In screen-reader mode, renders a static flame + tagline so a11y users
 *   still get the equivalent information without animation.
 */
export const VestaSplash: React.FC<VestaSplashProps> = ({
  visible,
  onDismiss,
  durationMs = 1500,
}) => {
  // Hooks first (Rules of Hooks). useSettings, useFlameAnimation, and
  // useIsScreenReaderEnabled must be called every render regardless of
  // `visible` or `isVestaEnv()`.
  const settings = useSettings();
  const animationsEnabled =
    settings.merged.ui?.animations === true ||
    process.env['VITEST'] !== undefined;
  const screenReader = useIsScreenReaderEnabled();
  const flameFrame = useFlameAnimation(vestaFlameFrames.length, {
    fps: 8,
    enabled: visible && animationsEnabled,
  });

  // Auto-dismiss after durationMs.
  useEffect(() => {
    if (!visible) {
      return;
    }
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [visible, durationMs, onDismiss]);

  // Any keypress dismisses early.
  useKeypress(
    (key) => {
      if (visible) {
        onDismiss();
        if (key.ctrl && key.name === 'c') {
          return false;
        }
        return true;
      }
      return false;
    },
    { isActive: visible },
  );

  if (!isVestaEnv() || !visible) {
    return null;
  }

  if (screenReader) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Text color={FIRE_PALETTE[3]}>Vesta</Text>
        <Text color={FIRE_PALETTE[1]} italic>
          {TAGLINE}
        </Text>
      </Box>
    );
  }

  const frame = vestaFlameFrames[flameFrame];
  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Text color={FIRE_PALETTE[3]} bold>
        {shortAsciiLogo}
      </Text>
      <Box marginTop={1}>
        <Box marginRight={1} flexDirection="column">
          {frame.rows.map((row, i) => (
            <Text key={i} color={frame.colors[i]}>
              {row}
            </Text>
          ))}
        </Box>
        <Text color={FIRE_PALETTE[1]} italic>
          {TAGLINE}
        </Text>
      </Box>
    </Box>
  );
};
