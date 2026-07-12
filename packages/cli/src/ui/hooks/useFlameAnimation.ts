/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { debugState } from '../debug.js';

export interface UseFlameAnimationOptions {
  /**
   * Frames per second. Default 1.5 — designed for a slow, ambient pulse
   * (footer heartbeat, splash idle). Spinners should pass a higher fps.
   */
  fps?: number;
  /**
   * When false, the hook freezes at frame 0 and starts no interval.
   * Useful for screen-reader mode or `prefers-reduced-motion` callers.
   */
  enabled?: boolean;
}

/**
 * Returns the current frame index for a flame / pulse animation.
 *
 * Cycles `0..frameCount-1` at the given fps.
 *
 * Visibility rules (most-permissive wins):
 * 1. Test env (Vitest / NODE_ENV=test) — always enabled so frame=0 stays
 *    deterministic unless the caller advances fake timers.
 * 2. Production — the flame is the signature visual of the Vesta fork;
 *    a user-disabled `settings.ui.animations` would defeat the purpose
 *    of running Vesta. The flame always animates in real terminals.
 *
 * See `useAnimatedScrollbar.ts` for the same test-env convention.
 */
export function useFlameAnimation(
  frameCount: number,
  options: UseFlameAnimationOptions = {},
): number {
  const { fps = 1.5, enabled = true } = options;
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!enabled || frameCount <= 1) {
      return;
    }
    debugState.debugNumAnimatedComponents++;

    const interval = setInterval(
      () => {
        setFrame((f) => (f + 1) % frameCount);
      },
      Math.round(1000 / fps),
    );

    return () => {
      debugState.debugNumAnimatedComponents--;
      clearInterval(interval);
    };
  }, [enabled, frameCount, fps]);

  return frame;
}
