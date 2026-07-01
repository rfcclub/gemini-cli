/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  type TerminalBackgroundColor,
  terminalCapabilityManager,
} from '../ui/utils/terminalCapabilityManager.js';
import { themeManager, DEFAULT_THEME } from '../ui/themes/theme-manager.js';
import { pickDefaultThemeName } from '../ui/themes/theme.js';
import { getThemeTypeFromBackgroundColor } from '../ui/themes/color-utils.js';
import type { LoadedSettings } from '../config/settings.js';
import { type Config, coreEvents, debugLogger } from '@google/gemini-cli-core';

/**
 * Detects terminal capabilities, loads themes, and sets the active theme.
 * Detection runs asynchronously — theme is set immediately with defaults,
 * then updated when detection completes.
 * @param config The application config.
 * @param settings The loaded settings.
 * @returns The detected terminal background color (undefined if detection still in progress).
 */
export async function setupTerminalAndTheme(
  config: Config,
  settings: LoadedSettings,
): Promise<TerminalBackgroundColor> {
  // Load custom themes from settings (synchronous, fast)
  themeManager.loadCustomThemes(settings.merged.ui.customThemes);

  // Set theme immediately with defaults (no blocking on detection)
  if (settings.merged.ui.theme) {
    if (!themeManager.setActiveTheme(settings.merged.ui.theme)) {
      debugLogger.warn(
        `Warning: Theme "${settings.merged.ui.theme}" not found.`,
      );
    }
  } else {
    // Use default theme without background detection
    themeManager.setActiveTheme(DEFAULT_THEME.name);
  }

  // Start capability detection in the background (non-blocking)
  if (config.isInteractive() && process.stdin.isTTY) {
    // Fire-and-forget: detection runs async, updates theme when done
    terminalCapabilityManager
      .detectCapabilities()
      .then(() => {
        const terminalBackground =
          terminalCapabilityManager.getTerminalBackgroundColor();
        config.setTerminalBackground(terminalBackground);
        themeManager.setTerminalBackground(terminalBackground);

        // Re-evaluate theme with background color info
        if (!settings.merged.ui.theme && terminalBackground !== undefined) {
          const themeName = pickDefaultThemeName(
            terminalBackground,
            themeManager.getAllThemes(),
            DEFAULT_THEME.name,
            'Default Light',
          );
          themeManager.setActiveTheme(themeName);
        }

        // Auto-theme compatibility warning
        if (
          terminalBackground !== undefined &&
          (settings.merged.ui.autoThemeSwitching ?? true)
        ) {
          const currentTheme = themeManager.getActiveTheme();
          if (
            !themeManager.isThemeCompatible(currentTheme, terminalBackground)
          ) {
            const backgroundType =
              getThemeTypeFromBackgroundColor(terminalBackground);
            coreEvents.emitFeedback(
              'warning',
              `Theme '${currentTheme.name}' (${currentTheme.type}) might look incorrect on your ${backgroundType} terminal background. Type /theme to change theme.`,
            );
          }
        }
      })
      .catch((e) => {
        debugLogger.warn('Terminal capability detection failed:', e);
      });

    // Return immediately — detection is in background
    return undefined;
  }

  return undefined;
}
