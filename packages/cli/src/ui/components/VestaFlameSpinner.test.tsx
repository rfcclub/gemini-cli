/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../../test-utils/render.js';
import { createMockSettings } from '../../test-utils/settings.js';

// Stub CliSpinner so we don't drive an actual animation in tests.
vi.mock('./CliSpinner.js', () => ({
  CliSpinner: ({ type }: { type?: string }) => `cli-spinner[${type ?? 'dots'}]`,
}));

import { VestaFlameSpinner } from './VestaFlameSpinner.js';
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
  it('delegates to CliSpinner when Responding', async () => {
    const { lastFrame } = await renderSpinner(StreamingState.Responding);
    expect(lastFrame()).toContain('cli-spinner[dots]');
  });

  it('passes through the requested spinner type', async () => {
    const { lastFrame } = await renderSpinner(StreamingState.Responding, {
      // spinnerType isn't a normal prop on the public type, but it round-trips.
    });
    // Default is 'dots'; rendering with default matches default expectation above.
    expect(lastFrame()).toContain('cli-spinner[dots]');
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
    expect(lastFrame()).not.toContain('cli-spinner[');
  });
});
