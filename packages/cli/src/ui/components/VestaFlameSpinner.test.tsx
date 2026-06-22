/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test-utils/render.js';
import { createMockSettings } from '../../test-utils/settings.js';

// Mocks must be hoisted, so put them in vi.hoisted.
const mocks = vi.hoisted(() => ({
  useFlameAnimation: vi.fn(() => 0),
}));

vi.mock('../hooks/useFlameAnimation.js', () => ({
  useFlameAnimation: mocks.useFlameAnimation,
}));

import { VestaFlameSpinner } from './VestaFlameSpinner.js';
import { vestaFlameFrames } from './AsciiArt.js';
import { StreamingState } from '../types.js';
import { StreamingContext } from '../contexts/StreamingContext.js';

const renderSpinner = (
  streamingState: StreamingState,
  props: { nonRespondingDisplay?: string; isHookActive?: boolean } = {},
) =>
  renderWithProviders(
    <StreamingContext.Provider value={streamingState}>
      <VestaFlameSpinner {...props} />
    </StreamingContext.Provider>,
    { settings: createMockSettings() },
  );

describe('<VestaFlameSpinner />', () => {
  beforeEach(() => {
    mocks.useFlameAnimation.mockReturnValue(0);
  });

  it('renders the current flame frame when Responding', async () => {
    mocks.useFlameAnimation.mockReturnValue(1);
    const { lastFrame } = await renderSpinner(StreamingState.Responding);
    const [expectedRow] = vestaFlameFrames[1].rows;
    expect(lastFrame()).toContain(expectedRow);
  });

  it('renders nonRespondingDisplay when not Responding', async () => {
    const { lastFrame } = await renderSpinner(StreamingState.Idle, {
      nonRespondingDisplay: '⠏',
    });
    expect(lastFrame()).toContain('⠏');
  });

  it('renders null when not Responding and no nonRespondingDisplay', async () => {
    const { lastFrame } = await renderSpinner(StreamingState.Idle);
    expect(lastFrame({ allowEmpty: true })).toBe('');
  });

  it('prioritizes nonRespondingDisplay when isHookActive even if Responding', async () => {
    const { lastFrame } = await renderSpinner(StreamingState.Responding, {
      nonRespondingDisplay: '🔧',
      isHookActive: true,
    });
    expect(lastFrame()).toContain('🔧');
  });
});
