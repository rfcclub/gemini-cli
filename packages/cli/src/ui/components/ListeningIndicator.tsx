/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useState, useEffect } from 'react';
import { Text, useIsScreenReaderEnabled } from 'ink';
import { useSettings } from '../contexts/SettingsContext.js';

const WAVE_CHARS = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
const ANIMATION_SPEED = 0.4;
const BAR_PHASE_OFFSET = 1.2;
const MAX_HEIGHT_MULTIPLIER = 3.5;
const FRAME_INTERVAL_MS = 40; // ~33 FPS

export interface ListeningIndicatorProps {
  color?: string;
}

export const ListeningIndicator: React.FC<ListeningIndicatorProps> = ({
  color,
}) => {
  const settings = useSettings();
  const animationsEnabled = settings.merged.ui?.animations === true;
  const [tick, setTick] = useState(0);
  const isScreenReaderEnabled = useIsScreenReaderEnabled();

  useEffect(() => {
    if (isScreenReaderEnabled || !animationsEnabled) return;
    const timer = setInterval(() => setTick((t) => t + 1), FRAME_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isScreenReaderEnabled, animationsEnabled]);

  if (isScreenReaderEnabled) {
    return <Text color={color}>Listening... </Text>;
  }

  // Generate 3 bars for the wave
  const bars = Array.from({ length: 3 }).map((_, i) => {
    // If animations are disabled, use a fixed tick (0)
    const currentTick = animationsEnabled ? tick : 0;
    // Sine wave calculation to map to our 8 block characters (0-7)
    const phase = currentTick * ANIMATION_SPEED + i * BAR_PHASE_OFFSET;
    const height = Math.floor((Math.sin(phase) + 1) * MAX_HEIGHT_MULTIPLIER);
    return WAVE_CHARS[Math.max(0, Math.min(7, height))] ?? ' ';
  });

  return <Text color={color}>{bars.join('')} </Text>;
};
