/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test-utils/render.js';
import { createMockSettings } from '../../test-utils/settings.js';

const mocks = vi.hoisted(() => ({
  isVestaEnv: vi.fn(() => false),
  useFlameAnimation: vi.fn(() => 0),
}));

vi.mock('./AsciiArt.js', async () => {
  const actual =
    await vi.importActual<typeof import('./AsciiArt.js')>('./AsciiArt.js');
  return {
    ...actual,
    isVestaEnv: mocks.isVestaEnv,
  };
});

vi.mock('../hooks/useFlameAnimation.js', () => ({
  useFlameAnimation: mocks.useFlameAnimation,
}));

import { VestaSplash } from './VestaSplash.js';
import { vestaFlameFrames } from './AsciiArt.js';

describe('<VestaSplash />', () => {
  beforeEach(() => {
    mocks.isVestaEnv.mockReturnValue(false);
    mocks.useFlameAnimation.mockReturnValue(0);
  });

  it('renders nothing in Gemini mode', async () => {
    mocks.isVestaEnv.mockReturnValue(false);
    const { lastFrame } = await renderWithProviders(
      <VestaSplash visible={true} onDismiss={() => {}} />,
      { settings: createMockSettings() },
    );
    expect(lastFrame({ allowEmpty: true })).toBe('');
  });

  it('renders the Vesta logo + tagline in Vesta mode', async () => {
    mocks.isVestaEnv.mockReturnValue(true);
    const { lastFrame } = await renderWithProviders(
      <VestaSplash visible={true} onDismiss={() => {}} />,
      { settings: createMockSettings() },
    );
    expect(lastFrame()).toContain('The Athanor is hot. Vesta is ready.');
    // The flame is rendered with block characters (\u2588). Assert the
    // char appears regardless of which logo (Vesta/Gemini) is bundled
    // into shortAsciiLogo at module load time.
    expect(lastFrame()).toContain('\u2588');
  });

  it('includes the current flame frame in the rendered output', async () => {
    mocks.isVestaEnv.mockReturnValue(true);
    mocks.useFlameAnimation.mockReturnValue(2);
    const { lastFrame } = await renderWithProviders(
      <VestaSplash visible={true} onDismiss={() => {}} />,
      { settings: createMockSettings() },
    );
    // The peak frame is all block characters.
    expect(lastFrame()).toContain(vestaFlameFrames[2].rows[0]);
  });

  it('renders nothing when visible is false even in Vesta mode', async () => {
    mocks.isVestaEnv.mockReturnValue(true);
    const { lastFrame } = await renderWithProviders(
      <VestaSplash visible={false} onDismiss={() => {}} />,
      { settings: createMockSettings() },
    );
    expect(lastFrame({ allowEmpty: true })).toBe('');
  });

  it('calls onDismiss after durationMs', async () => {
    mocks.isVestaEnv.mockReturnValue(true);
    const onDismiss = vi.fn();
    vi.useFakeTimers();
    try {
      await renderWithProviders(
        <VestaSplash visible={true} onDismiss={onDismiss} durationMs={500} />,
        { settings: createMockSettings() },
      );
      vi.advanceTimersByTime(500);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
