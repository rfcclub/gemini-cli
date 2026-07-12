/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useEffect } from 'react';
import { Box, Text, useIsScreenReaderEnabled } from 'ink';
import { FIRE_PALETTE, shortAsciiLogo } from './AsciiArt.js';
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
 * Boot splash for Vesta. Renders the short Vesta logo + tagline as a
 * static block — the previous flame animation was removed because it
 * contributed to UI flicker during boot. Auto-dismisses after
 * `durationMs` (default 1500) or on any keypress.
 *
 * - Returns `null` when `visible` is false.
 * - In screen-reader mode, renders the same text content (logo + tagline)
 *   without color so a11y users get the equivalent information.
 */
export const VestaSplash: React.FC<VestaSplashProps> = ({
  visible,
  onDismiss,
  durationMs = 1500,
}) => {
  // Hooks first (Rules of Hooks). useIsScreenReaderEnabled must be called
  // every render regardless of `visible`.
  const screenReader = useIsScreenReaderEnabled();

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

  if (!visible) {
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

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Text color={FIRE_PALETTE[3]} bold>
        {shortAsciiLogo}
      </Text>
      <Box marginTop={1}>
        <Text color={FIRE_PALETTE[1]} italic>
          {TAGLINE}
        </Text>
      </Box>
    </Box>
  );
};
