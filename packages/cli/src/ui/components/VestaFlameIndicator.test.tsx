/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test-utils/render.js';
import { createMockSettings } from '../../test-utils/settings.js';
import type { LoadedSettings } from '../../config/settings.js';

// Mock the Vesta env detector + asset module so we can flip between modes
// without touching the real `process.env.ATHANOR_DIR` / `VESTA_ATHANOR_DIR`.
// vi.hoisted runs alongside vi.mock hoisting, so the mock factories below
// can safely close over the same object.
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

// Mock the animation hook so we get a deterministic frame index 0 in tests
// (no setInterval ticking). We still verify the hook is called with the
// correct frame count from `vestaMiniFlameFrames.length`.
vi.mock('../hooks/useFlameAnimation.js', () => ({
  useFlameAnimation: mocks.useFlameAnimation,
}));

import { VestaFlameIndicator } from './VestaFlameIndicator.js';
import { vestaMiniFlameFrames } from './AsciiArt.js';

const renderIndicator = (settings: LoadedSettings) =>
  renderWithProviders(<VestaFlameIndicator />, { settings });

describe('<VestaFlameIndicator />', () => {
  beforeEach(() => {
    mocks.isVestaEnv.mockReturnValue(false);
    mocks.useFlameAnimation.mockClear();
    mocks.useFlameAnimation.mockReturnValue(0);
  });

  it('renders nothing in Gemini mode (isVestaEnv = false)', async () => {
    mocks.isVestaEnv.mockReturnValue(false);
    const { lastFrame } = await renderIndicator(createMockSettings());
    expect(lastFrame({ allowEmpty: true })).toBe('');
  });

  it('renders the first flame frame in Vesta mode by default', async () => {
    mocks.isVestaEnv.mockReturnValue(true);
    const { lastFrame } = await renderIndicator(createMockSettings());
    const [expectedChars, expectedColor] = vestaMiniFlameFrames[0];
    expect(lastFrame()).toContain(expectedChars);
    // Frame 0 is a dim core (orangered); spot-check the rendered color
    // appears by checking the text segment is present.
    expect(mocks.useFlameAnimation).toHaveBeenCalledWith(
      vestaMiniFlameFrames.length,
      expect.objectContaining({ fps: 1.5, enabled: true }),
    );
    // Sanity: the expected color is the one bound to frame 0.
    expect(expectedColor).toBe('#FF4500');
  });

  it('renders the static fire emoji in screen-reader mode', async () => {
    mocks.isVestaEnv.mockReturnValue(true);
    const settings = createMockSettings({
      ui: { accessibility: { screenReader: true } },
    });
    const { lastFrame } = await renderIndicator(settings);
    expect(lastFrame()).toContain('🔥');
  });

  it('renders the frame that the hook returns (not always frame 0)', async () => {
    mocks.isVestaEnv.mockReturnValue(true);
    mocks.useFlameAnimation.mockReturnValue(2);
    const { lastFrame } = await renderIndicator(createMockSettings());
    const [expectedChars] = vestaMiniFlameFrames[2];
    expect(lastFrame()).toContain(expectedChars);
  });
});
