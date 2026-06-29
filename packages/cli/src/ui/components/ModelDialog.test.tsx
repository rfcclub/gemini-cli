/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { ModelDialog } from './ModelDialog.js';
import { renderWithProviders } from '../../test-utils/render.js';
import { waitFor } from '../../test-utils/async.js';
import { createMockSettings } from '../../test-utils/settings.js';
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODEL_ALIAS_AUTO,
  DEFAULT_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_FLASH_LITE_MODEL,
  PREVIEW_GEMINI_MODEL,
  PREVIEW_GEMINI_3_1_MODEL,
  PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL,
  PREVIEW_GEMINI_FLASH_MODEL,
  PREVIEW_GEMINI_FLASH_LITE_MODEL,
  AuthType,
} from '@google/gemini-cli-core';
import type { Config, ModelSlashCommandEvent } from '@google/gemini-cli-core';

// Mock dependencies
const mockGetDisplayString = vi.fn();
const mockLogModelSlashCommand = vi.fn();
const mockModelSlashCommandEvent = vi.fn();

vi.mock('@google/gemini-cli-core', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@google/gemini-cli-core')>();
  return {
    ...actual,
    getAutoModelDescription: (
      hasAccessToPreview: boolean,
      useGemini3_1?: boolean,
    ) =>
      `Auto Model Description (preview: ${hasAccessToPreview}, 3.1: ${useGemini3_1})`,
    getDisplayString: (val: string) => mockGetDisplayString(val),
    logModelSlashCommand: (config: Config, event: ModelSlashCommandEvent) =>
      mockLogModelSlashCommand(config, event),
    ModelSlashCommandEvent: class {
      constructor(model: string) {
        mockModelSlashCommandEvent(model);
      }
    },
    PREVIEW_GEMINI_FLASH_LITE_MODEL: 'none',
  };
});

describe('<ModelDialog />', () => {
  const mockSetModel = vi.fn();
  const mockGetModel = vi.fn();
  const mockOnClose = vi.fn();
  const mockGetHasAccessToPreviewModel = vi.fn();
  const mockGetGemini31LaunchedSync = vi.fn();
  const mockGetGemini31FlashLiteLaunchedSync = vi.fn();
  const mockGetProModelNoAccess = vi.fn();
  const mockGetProModelNoAccessSync = vi.fn();

  interface MockConfig extends Partial<Config> {
    setModel: (model: string, isTemporary?: boolean) => void;
    getModel: () => string;
    getHasAccessToPreviewModel: () => boolean;
    getIdeMode: () => boolean;
    getGemini31LaunchedSync: () => boolean;
    getProModelNoAccess: () => Promise<boolean>;
    getProModelNoAccessSync: () => boolean;
    getExperimentalGemma: () => boolean;
    getLastRetrievedQuota: () =>
      | {
          buckets: Array<{
            modelId?: string;
            remainingFraction?: number;
            resetTime?: string;
          }>;
        }
      | undefined;
  }

  const mockConfig: MockConfig = {
    setModel: mockSetModel,
    getModel: mockGetModel,
    getHasAccessToPreviewModel: mockGetHasAccessToPreviewModel,
    getIdeMode: () => false,
    getGemini31LaunchedSync: mockGetGemini31LaunchedSync,
    getProModelNoAccess: mockGetProModelNoAccess,
    getProModelNoAccessSync: mockGetProModelNoAccessSync,
    getExperimentalGemma: () => false,
    getLastRetrievedQuota: () => ({ buckets: [] }),
    getSessionId: () => 'test-session-id',
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mockGetModel.mockReturnValue(GEMINI_MODEL_ALIAS_AUTO);
    mockGetHasAccessToPreviewModel.mockReturnValue(false);
    mockGetGemini31LaunchedSync.mockReturnValue(false);
    mockGetProModelNoAccess.mockResolvedValue(false);
    mockGetProModelNoAccessSync.mockReturnValue(false);

    // Default implementation for getDisplayString
    mockGetDisplayString.mockImplementation((val: string) => {
      if (val === 'auto') return 'Auto';
      return val;
    });
  });

  const renderComponent = async (
    configValue = mockConfig as Config,
    authType = AuthType.LOGIN_WITH_GOOGLE,
  ) => {
    const settings = createMockSettings({
      security: {
        auth: {
          selectedType: authType,
        },
      },
    });

    const result = await renderWithProviders(
      <ModelDialog onClose={mockOnClose} />,
      {
        config: configValue,
        settings,
      },
    );
    return result;
  };

  it('renders the initial "main" view correctly', async () => {
    const { lastFrame, unmount } = await renderComponent();
    expect(lastFrame()).toContain('Select Model');
    expect(lastFrame()).toContain('Remember model for future sessions: false');
    expect(lastFrame()).toContain('Auto');
    expect(lastFrame()).toContain('Manual');
    unmount();
  });

  it('renders the "manual" view initially for users with no pro access and filters Pro models with correct order', async () => {
    mockGetProModelNoAccessSync.mockReturnValue(true);
    mockGetProModelNoAccess.mockResolvedValue(true);
    mockGetHasAccessToPreviewModel.mockReturnValue(true);
    mockGetGemini31FlashLiteLaunchedSync.mockReturnValue(true);
    mockGetDisplayString.mockImplementation((val: string) => val);

    const { lastFrame, unmount } = await renderComponent();

    const output = lastFrame();
    expect(output).toContain('Select Model');
    expect(output).not.toContain(DEFAULT_GEMINI_MODEL);
    expect(output).not.toContain(PREVIEW_GEMINI_MODEL);

    // Verify order: Flash Preview -> Flash Lite (Preview/Default) -> Flash
    const flashPreviewIdx = output.indexOf(PREVIEW_GEMINI_FLASH_MODEL);
    const flashLiteIdx = output.indexOf(DEFAULT_GEMINI_FLASH_LITE_MODEL);
    const flashIdx = output.indexOf(DEFAULT_GEMINI_FLASH_MODEL);

    expect(flashPreviewIdx).toBeLessThan(flashLiteIdx);
    expect(flashLiteIdx).toBeLessThan(flashIdx);

    expect(output).not.toContain('Auto');
    unmount();
  });

  it('closes dialog on escape in "manual" view for users with no pro access', async () => {
    mockGetProModelNoAccessSync.mockReturnValue(true);
    mockGetProModelNoAccess.mockResolvedValue(true);
    const { stdin, waitUntilReady, unmount } = await renderComponent();

    // Already in manual view
    await act(async () => {
      stdin.write('\u001B'); // Escape
    });
    await act(async () => {
      await waitUntilReady();
    });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
    unmount();
  });

  it('switches to "manual" view when "Manual" is selected and uses getDisplayString for models', async () => {
    mockGetDisplayString.mockImplementation((val: string) => {
      if (val === DEFAULT_GEMINI_MODEL) return 'Formatted Pro Model';
      if (val === DEFAULT_GEMINI_FLASH_MODEL) return 'Formatted Flash Model';
      if (val === DEFAULT_GEMINI_FLASH_LITE_MODEL)
        return 'Formatted Lite Model';
      return val;
    });

    const { lastFrame, stdin, waitUntilReady, unmount } =
      await renderComponent();

    // Select "Manual" (index 1)
    // Press down arrow to move to "Manual"
    await act(async () => {
      stdin.write('\u001B[B'); // Arrow Down
    });
    await waitUntilReady();

    // Press enter to select
    await act(async () => {
      stdin.write('\r');
    });
    await waitUntilReady();

    // Should now show manual options
    await waitFor(() => {
      const output = lastFrame();
      expect(output).toContain('Formatted Pro Model');
      expect(output).toContain('Formatted Flash Model');
      expect(output).toContain('Formatted Lite Model');
    });
    unmount();
  });

  it('sets model and closes when a model is selected in "main" view', async () => {
    const { stdin, waitUntilReady, unmount } = await renderComponent();

    // Select "Auto" (index 0)
    await act(async () => {
      stdin.write('\r');
    });
    await waitUntilReady();

    await waitFor(() => {
      expect(mockSetModel).toHaveBeenCalledWith(
        GEMINI_MODEL_ALIAS_AUTO,
        true, // Session only by default
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
    unmount();
  });

  it('sets model and closes when a model is selected in "manual" view', async () => {
    const { stdin, waitUntilReady, unmount } = await renderComponent();

    // Navigate to Manual (index 1) and select
    await act(async () => {
      stdin.write('\u001B[B');
    });
    await waitUntilReady();
    await act(async () => {
      stdin.write('\r');
    });
    await waitUntilReady();

    // Now in manual view. Default selection is first item (DEFAULT_GEMINI_MODEL)
    await act(async () => {
      stdin.write('\r');
    });
    await waitUntilReady();

    await waitFor(() => {
      expect(mockSetModel).toHaveBeenCalledWith(DEFAULT_GEMINI_MODEL, true);
      expect(mockOnClose).toHaveBeenCalled();
    });
    unmount();
  });

  it('toggles persist mode with Tab key', async () => {
    const { lastFrame, stdin, waitUntilReady, unmount } =
      await renderComponent();

    expect(lastFrame()).toContain('Remember model for future sessions: false');

    // Press Tab to toggle persist mode
    await act(async () => {
      stdin.write('\t');
    });
    await waitUntilReady();

    await waitFor(() => {
      expect(lastFrame()).toContain('Remember model for future sessions: true');
    });

    // Select "Auto" (index 0)
    await act(async () => {
      stdin.write('\r');
    });
    await waitUntilReady();

    await waitFor(() => {
      expect(mockSetModel).toHaveBeenCalledWith(
        GEMINI_MODEL_ALIAS_AUTO,
        false, // Persist enabled
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
    unmount();
  });

  it('closes dialog on escape in "main" view', async () => {
    const { stdin, waitUntilReady, unmount } = await renderComponent();

    await act(async () => {
      stdin.write('\u001B'); // Escape
    });
    // Escape key has a 50ms timeout in KeypressContext, so we need to wrap waitUntilReady in act
    await act(async () => {
      await waitUntilReady();
    });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
    unmount();
  });

  it('goes back to "main" view on escape in "manual" view', async () => {
    const { lastFrame, stdin, waitUntilReady, unmount } =
      await renderComponent();

    // Go to manual view
    await act(async () => {
      stdin.write('\u001B[B');
    });
    await waitUntilReady();
    await act(async () => {
      stdin.write('\r');
    });
    await waitUntilReady();

    await waitFor(() => {
      expect(lastFrame()).toContain(DEFAULT_GEMINI_MODEL);
    });

    // Press Escape
    await act(async () => {
      stdin.write('\u001B');
    });
    await act(async () => {
      await waitUntilReady();
    });

    await waitFor(() => {
      expect(mockOnClose).not.toHaveBeenCalled();
      // Should be back to main view (Manual option visible)
      expect(lastFrame()).toContain('Manual');
    });
    unmount();
  });

  it('shows the preferred manual model in the main view option using getDisplayString', async () => {
    mockGetModel.mockReturnValue(DEFAULT_GEMINI_MODEL);
    mockGetDisplayString.mockImplementation((val: string) => {
      if (val === DEFAULT_GEMINI_MODEL) return 'My Custom Model Display';
      if (val === 'auto') return 'Auto';
      return val;
    });
    const { lastFrame, unmount } = await renderComponent();

    expect(lastFrame()).toContain('Manual (My Custom Model Display)');
    unmount();
  });

  // ---------------------------------------------------------------------------
  // Vesta: dynamic model configuration path
  // When experimental.dynamicModelConfiguration is enabled, the dialog should:
  //   1. Drop GEMINI_MODEL_ALIAS_AUTO from the main view.
  //   2. Always show a "Manual" entry as the only main-view option.
  //   3. Inside the manual view, list external providers (tier='external')
  //      FIRST, with their friendly names and provider-type descriptions.
  // ---------------------------------------------------------------------------
  describe('Vesta: dynamic model configuration path', () => {
    const EXTERNAL_PROVIDER_OPTION = {
      modelId: 'minimax/MiniMax-M3',
      name: 'minimax · MiniMax-M3',
      description:
        'minimax provider (openai-compatible) · https://api.minimax.io/v1',
      tier: 'external',
    };
    const GEMINI_DEFINITION_OPTION = {
      modelId: DEFAULT_GEMINI_MODEL,
      name: 'Gemini 2.5 Pro',
      description: '',
      tier: 'pro',
    };

    const buildDynamicConfig = (): Config => {
      const cfg = mockConfig as Config;
      return Object.assign(Object.create(Object.getPrototypeOf(cfg)), cfg, {
        getExperimentalDynamicModelConfiguration: () => true,
        getModelConfigService: () => ({
          getAvailableModelOptions: () => [
            EXTERNAL_PROVIDER_OPTION,
            { ...GEMINI_DEFINITION_OPTION },
          ],
          getModelDefinition: (modelId: string) =>
            modelId === DEFAULT_GEMINI_MODEL
              ? { tier: 'pro', isVisible: true }
              : undefined,
        }),
      }) as unknown as Config;
    };

    it('does not surface Auto in the main view when dynamic configuration is enabled', async () => {
      const { lastFrame, unmount } =
        await renderComponent(buildDynamicConfig());

      const output = lastFrame();
      expect(output).not.toContain('Auto');
      // Manual entry is still present.
      expect(output).toContain('Manual');
      unmount();
    });

    it('lists external providers first in the manual view with their descriptions', async () => {
      const { lastFrame, stdin, waitUntilReady, unmount } =
        await renderComponent(buildDynamicConfig());

      // Enter the manual view (only one option in main view → index 0).
      await act(async () => {
        stdin.write('\r');
      });
      await waitUntilReady();

      await waitFor(() => {
        const output = lastFrame();
        // External provider must appear before the Gemini definition.
        const extIdx = output.indexOf('minimax · MiniMax-M3');
        const geminiIdx = output.indexOf('Gemini 2.5 Pro');
        expect(extIdx).toBeGreaterThanOrEqual(0);
        expect(geminiIdx).toBeGreaterThan(0);
        expect(extIdx).toBeLessThan(geminiIdx);
        // Provider type description should be visible.
        expect(output).toContain('openai-compatible');
      });
      unmount();
    });

    it('selects an external provider when its row is highlighted and Enter is pressed', async () => {
      const { stdin, waitUntilReady, unmount } =
        await renderComponent(buildDynamicConfig());

      // Open manual view
      await act(async () => {
        stdin.write('\r');
      });
      await waitUntilReady();

      // Confirm first item (the external provider)
      await act(async () => {
        stdin.write('\r');
      });
      await waitUntilReady();

      await waitFor(() => {
        expect(mockSetModel).toHaveBeenCalledWith('minimax/MiniMax-M3', true);
        expect(mockOnClose).toHaveBeenCalled();
      });
      unmount();
    });
  });

  describe('Preview Models', () => {
    beforeEach(() => {
      mockGetHasAccessToPreviewModel.mockReturnValue(true);
    });

    it('shows Auto in main view when access is granted', async () => {
      const { lastFrame, unmount } = await renderComponent();
      expect(lastFrame()).toContain('Auto');
      unmount();
    });

    it('shows Gemini 3 models in manual view when Gemini 3.1 is NOT launched', async () => {
      mockGetGemini31LaunchedSync.mockReturnValue(false);
      const { lastFrame, stdin, waitUntilReady, unmount } =
        await renderComponent();

      // Go to manual view
      await act(async () => {
        stdin.write('\u001B[B'); // Manual
      });
      await waitUntilReady();
      await act(async () => {
        stdin.write('\r');
      });
      await waitUntilReady();

      const output = lastFrame();
      expect(output).toContain(PREVIEW_GEMINI_MODEL);
      expect(output).toContain(PREVIEW_GEMINI_FLASH_MODEL);
      unmount();
    });

    it('shows Gemini 3.1 models in manual view when Gemini 3.1 IS launched', async () => {
      mockGetGemini31LaunchedSync.mockReturnValue(true);
      const { lastFrame, stdin, waitUntilReady, unmount } =
        await renderComponent(mockConfig as Config, AuthType.USE_VERTEX_AI);

      // Go to manual view
      await act(async () => {
        stdin.write('\u001B[B'); // Manual
      });
      await waitUntilReady();
      await act(async () => {
        stdin.write('\r');
      });
      await waitUntilReady();

      const output = lastFrame();
      expect(output).toContain(PREVIEW_GEMINI_3_1_MODEL);
      expect(output).toContain(PREVIEW_GEMINI_FLASH_MODEL);
      unmount();
    });

    it('uses custom tools model when Gemini 3.1 IS launched and auth is Gemini API Key', async () => {
      mockGetGemini31LaunchedSync.mockReturnValue(true);
      const { stdin, waitUntilReady, unmount } = await renderComponent(
        mockConfig as Config,
        AuthType.USE_GEMINI,
      );

      // Go to manual view
      await act(async () => {
        stdin.write('\u001B[B'); // Manual
      });
      await waitUntilReady();
      await act(async () => {
        stdin.write('\r');
      });
      await waitUntilReady();

      // Select Gemini 3.1 (first item in preview section)
      await act(async () => {
        stdin.write('\r');
      });
      await waitUntilReady();

      await waitFor(() => {
        expect(mockSetModel).toHaveBeenCalledWith(
          PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL,
          true,
        );
      });
      unmount();
    });

    it('does not show Flash Lite Preview model when it is retired (none) even if flag is enabled', async () => {
      mockGetProModelNoAccessSync.mockReturnValue(false);
      mockGetProModelNoAccess.mockResolvedValue(false);
      mockGetHasAccessToPreviewModel.mockReturnValue(true);
      mockGetGemini31FlashLiteLaunchedSync.mockReturnValue(true);
      const { lastFrame, stdin, waitUntilReady, unmount } =
        await renderComponent();

      // Go to manual view
      await act(async () => {
        stdin.write('\u001B[B'); // Manual
      });
      await waitUntilReady();
      await act(async () => {
        stdin.write('\r');
      });
      await waitUntilReady();

      const output = lastFrame();
      expect(output).not.toContain(PREVIEW_GEMINI_FLASH_LITE_MODEL);
      expect(output).toContain(DEFAULT_GEMINI_FLASH_LITE_MODEL);
      unmount();
    });
  });

  // ---------------------------------------------------------------------------
  // Vesta: scroll indicators for large catalogs (regression 2026-06-28).
  // Providers.yaml exposes 55 models across multiple vendors. The dialog
  // must show ▲▼ so users know to scroll — otherwise entries beyond the
  // first 15 silently disappear and the user concludes models are missing.
  // ---------------------------------------------------------------------------
  describe('Vesta: scroll indicators for large external catalogs', () => {
    // Build a synthetic 55-item catalog mirroring the real providers.yaml.
    const buildLargeCatalogConfig = (): Config => {
      const cfg = mockConfig as Config;
      const externalOptions: Array<{
        modelId: string;
        name: string;
        description: string;
        tier: string;
      }> = [];

      const addProvider = (
        name: string,
        type: string,
        baseUrl: string,
        models: string[],
      ) => {
        for (const m of models) {
          externalOptions.push({
            modelId: `${name}/${m}`,
            name: `${name} · ${m}`,
            description: `${name} provider (${type}) · ${baseUrl}`,
            tier: 'external',
          });
        }
      };

      addProvider('deepseek', 'openai-compatible', 'https://api.deepseek.com', [
        'deepseek-v4-flash',
        'deepseek-v4-pro',
      ]);
      addProvider('minimax', 'openai-compatible', 'https://api.minimax.io/v1', [
        'MiniMax-M3',
        'MiniMax-M2.7',
        'MiniMax-M2.7-highspeed',
        'MiniMax-M2.5',
        'MiniMax-M2.5-highspeed',
        'MiniMax-M2.1',
        'MiniMax-M2.1-highspeed',
        'MiniMax-M2',
      ]);
      addProvider(
        'groq',
        'openai-compatible',
        'https://api.groq.com/openai/v1',
        [
          'qwen/qwen3-32b',
          'meta-llama/llama-4-scout-17b-16e-instruct',
          'openai/gpt-oss-120b',
          'qwen/qwen3.6-27b',
          'llama-3.3-70b-versatile',
          'openai/gpt-oss-20b',
          'llama-3.1-8b-instant',
          'groq/compound',
          'groq/compound-mini',
          'canopylabs/orpheus-v1-english',
          'canopylabs/orpheus-arabic-saudi',
          'whisper-large-v3',
          'whisper-large-v3-turbo',
          'meta-llama/llama-prompt-guard-2-86m',
          'meta-llama/llama-prompt-guard-2-22m',
          'allam-2-7b',
        ],
      );
      addProvider(
        'opencode',
        'openai-compatible',
        'https://opencode.ai/zen/go/v1',
        [
          'kimi-k2.7-code',
          'kimi-k2.6',
          'kimi-k2.5',
          'qwen3.7-max',
          'qwen3.7-plus',
          'qwen3.6-plus',
          'qwen3.5-plus',
          'glm-5.2',
          'glm-5.1',
          'glm-5',
          'deepseek-v4-pro',
          'deepseek-v4-flash',
          'mimo-v2.5-pro',
          'mimo-v2.5',
          'mimo-v2-pro',
          'mimo-v2-omni',
          'minimax-m3',
          'minimax-m2.7',
          'minimax-m2.5',
          'hy3-preview',
        ],
      );
      addProvider(
        'xiaomi',
        'anthropic',
        'https://token-plan-sgp.xiaomimimo.com/anthropic',
        [
          'mimo-v2-omni',
          'mimo-v2-pro',
          'mimo-v2-tts',
          'mimo-v2.5',
          'mimo-v2.5-asr',
          'mimo-v2.5-pro',
          'mimo-v2.5-tts',
          'mimo-v2.5-tts-voiceclone',
          'mimo-v2.5-tts-voicedesign',
        ],
      );

      expect(externalOptions).toHaveLength(55); // sanity: real catalog size

      return Object.assign(Object.create(Object.getPrototypeOf(cfg)), cfg, {
        getExperimentalDynamicModelConfiguration: () => true,
        getModelConfigService: () => ({
          getAvailableModelOptions: () => externalOptions,
          getModelDefinition: () => undefined,
        }),
      }) as unknown as Config;
    };

    it('renders scroll arrows when the external catalog exceeds maxItemsToShow', async () => {
      const { lastFrame, stdin, waitUntilReady, unmount } =
        await renderComponent(buildLargeCatalogConfig());

      // Open the manual view (only "Manual" entry in the main view).
      await act(async () => {
        stdin.write('\r');
      });
      await waitUntilReady();

      await waitFor(() => {
        const output = lastFrame();
        // The fix pins ▲▼ to appear whenever items.length > maxItemsToShow.
        // Without the fix, users would only see the first 10 items with no
        // indication that 45 more entries exist below.
        expect(output).toContain('▲');
        expect(output).toContain('▼');
      });
      unmount();
    });

    it('surfaces vendors beyond the first page (MiniMax M2.x and Xiaomi mimo) via scroll', async () => {
      const { lastFrame, stdin, waitUntilReady, unmount } =
        await renderComponent(buildLargeCatalogConfig());

      // Open manual view.
      await act(async () => {
        stdin.write('\r');
      });
      await waitUntilReady();

      // Initial page must show some MiniMax variants (they're at the top
      // of the catalog — first ~10 items).
      await waitFor(() => {
        const output = lastFrame();
        expect(output).toContain('MiniMax-M3');
      });

      // Jump to item #55 (index 54) via numeric input. The selection list
      // supports "showNumbers" jumping: typing "55" highlights the 55th
      // entry and the viewport scrolls down to make it visible.
      await act(async () => {
        stdin.write('55');
      });
      await waitUntilReady();

      await waitFor(() => {
        const output = lastFrame();
        // Xiaomi mimo-v2.5-tts-voicedesign sits near the bottom of the
        // 55-item list — proving the user CAN reach it via keyboard scroll.
        expect(output).toContain('mimo-v2.5-tts-voicedesign');
      });
      unmount();
    });
  });
});
