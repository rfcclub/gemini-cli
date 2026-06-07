/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { useSettings } from './SettingsContext.js';

const CursorBlinkContext = createContext<boolean>(true);

export const CursorBlinkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const settings = useSettings();
  const animationsEnabled = settings.merged.ui?.animations === true;
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (!animationsEnabled) {
      setShowCursor(true);
      return;
    }
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, [animationsEnabled]);

  return (
    <CursorBlinkContext.Provider value={showCursor}>
      {children}
    </CursorBlinkContext.Provider>
  );
};

export const useCursorBlink = () => useContext(CursorBlinkContext);
