/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../../test-utils/render.js';
import { createMockSettings } from '../../test-utils/settings.js';

import { VestaSplash } from './VestaSplash.js';
import { shortAsciiLogo } from './AsciiArt.js';

describe('<VestaSplash />', () => {
  it('renders the Vesta logo + tagline', async () => {
    const { lastFrame } = await renderWithProviders(
      <VestaSplash visible={true} onDismiss={() => {}} />,
      { settings: createMockSettings() },
    );
    expect(lastFrame()).toContain('The Athanor is hot. Vesta is ready.');
    // Logo is the first row of the ASCII art; assert the leading characters
    // appear so we don't depend on block-character ranges.
    expect(lastFrame()).toContain(shortAsciiLogo.trim().split(/\r?\n/)[0]);
  });

  it('renders nothing when visible is false', async () => {
    const { lastFrame } = await renderWithProviders(
      <VestaSplash visible={false} onDismiss={() => {}} />,
      { settings: createMockSettings() },
    );
    expect(lastFrame({ allowEmpty: true })).toBe('');
  });

  it('calls onDismiss after durationMs', async () => {
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
