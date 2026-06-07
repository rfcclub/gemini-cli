/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import Spinner from 'ink-spinner';
import { type ComponentProps, useEffect } from 'react';
import { debugState } from '../debug.js';
import { useSettings } from '../contexts/SettingsContext.js';
import spinners from 'cli-spinners';
import { Text } from 'ink';

export type SpinnerProps = ComponentProps<typeof Spinner>;

export const CliSpinner = (props: SpinnerProps) => {
  const settings = useSettings();
  const shouldShow = settings.merged.ui?.showSpinner !== false;
  const animationsEnabled = settings.merged.ui?.animations === true;

  useEffect(() => {
    if (shouldShow && animationsEnabled) {
      debugState.debugNumAnimatedComponents++;
      return () => {
        debugState.debugNumAnimatedComponents--;
      };
    }
    return undefined;
  }, [shouldShow, animationsEnabled]);

  if (!shouldShow) {
    return null;
  }

  if (!animationsEnabled) {
    const spinnerName = props.type ?? 'dots';
    const spinner = spinners[spinnerName];
    return <Text>{spinner.frames[0]}</Text>;
  }

  return <Spinner {...props} />;
};
