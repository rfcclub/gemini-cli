# Implementation Plan: provider-catalog

## Preparation

- [x] Review spec scenarios for provider-catalog
- [x] Review design.md test strategy
- [x] Check `parseYaml` implementation to confirm loose parsing of unknown
      fields

## Tasks

### Task 1: RED — failing test for availableModels loading

**Files:**

- Create: `packages/core/src/services/providerRegistry.test.ts`

- [x] **Step 1: Write the failing test**

  ```ts
  describe('ProviderRegistry.loadFromGlobalConfig', () => {
    it('loads availableModels from YAML into registry', async () => {
      const yaml = `
  providers:
  minimax:
    type: openai-compatible
    baseUrl: https://api.minimax.io/v1
    apiKey: sk-test
    defaultModel: MiniMax-M3
    availableModels:
      - MiniMax-M3
      - MiniMax-M2.7
      - MiniMax-M2.5
  `;
      vi.mocked(fs.readFileSync).mockReturnValue(yaml);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(Storage.getGlobalGeminiDir).mockReturnValue('/mock/global');

      const registry = ProviderRegistry.getInstance();
      registry.clear();
      await registry.loadFromGlobalConfig();

      const cfg = registry.getProviderConfig('minimax');
      expect(cfg?.availableModels).toEqual([
        'MiniMax-M3',
        'MiniMax-M2.7',
        'MiniMax-M2.5',
      ]);
    });

    it('handles missing availableModels gracefully', async () => {
      const yaml = `
  providers:
  deepseek:
    type: openai-compatible
    baseUrl: https://api.deepseek.com
    defaultModel: deepseek-v4-flash
  `;
      vi.mocked(fs.readFileSync).mockReturnValue(yaml);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(Storage.getGlobalGeminiDir).mockReturnValue('/mock/global');

      const registry = ProviderRegistry.getInstance();
      registry.clear();
      await registry.loadFromGlobalConfig();

      const cfg = registry.getProviderConfig('deepseek');
      expect(cfg?.availableModels).toBeUndefined();
      expect(cfg?.defaultModel).toBe('deepseek-v4-flash');
    });

    it('preserves availableModels through env var expansion', async () => {
      process.env['TEST_API_KEY'] = 'sk-from-env';
      const yaml = `
  providers:
  openai:
    type: openai-compatible
    baseUrl: https://api.openai.com/v1
    apiKey: \${env:TEST_API_KEY}
    defaultModel: gpt-4o
    availableModels:
      - gpt-4o
      - gpt-4o-mini
  `;
      vi.mocked(fs.readFileSync).mockReturnValue(yaml);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(Storage.getGlobalGeminiDir).mockReturnValue('/mock/global');

      const registry = ProviderRegistry.getInstance();
      registry.clear();
      await registry.loadFromGlobalConfig();

      const cfg = registry.getProviderConfig('openai');
      expect(cfg?.apiKey).toBe('sk-from-env');
      expect(cfg?.availableModels).toEqual(['gpt-4o', 'gpt-4o-mini']);
    });

    it('does not throw on malformed YAML', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue(
        'this is: not: valid: yaml: :',
      );
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(Storage.getGlobalGeminiDir).mockReturnValue('/mock/global');

      const registry = ProviderRegistry.getInstance();
      registry.clear();

      await expect(registry.loadFromGlobalConfig()).resolves.not.toThrow();
    });
  });
  ```

  Run: `npx vitest run packages/core/src/services/providerRegistry.test.ts`
  Expected: **FAIL** — interface doesn't have `availableModels`, registry
  doesn't preserve it.

### Task 2: GREEN — add availableModels to schema

**Files:**

- Modify: `packages/core/src/services/providerRegistry.ts`

- [x] **Step 1: Extend the interface**

  ```ts
  export interface ProviderConfig {
    type: 'openai-compatible' | 'anthropic' | 'google';
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    customHeaders?: Record<string, string>;
    availableModels?: string[]; // <-- NEW
  }
  ```

- [x] **Step 2: Verify spread preserves the field** The existing
      `expandedConfig = { ...config, ... }` in `loadFromGlobalConfig` already
      spreads all fields. `availableModels` will pass through automatically.

  Run: `npx vitest run packages/core/src/services/providerRegistry.test.ts`
  Expected: **PASS** (all 4 new tests green)

- [x] **Step 3: Verify no regressions** Run:
      `npx vitest run packages/core/src/services/` Expected: All pre-existing
      tests still pass.

### Task 3: Update local providers.yaml

**Files:**

- Modify: `~/.gemini-vesta/providers.yaml` (local-only, NOT committed)

- [x] **Step 1: Add `availableModels` to all 5 active providers** Insert
      `availableModels: [...]` block under each provider with the catalog probed
      on 2026-06-27.

  Expected: YAML parses successfully,
  `getProviderConfig('minimax').availableModels` contains the 8 MiniMax models.

- [x] **Step 2: Add `# lastFetched: 2026-06-27` header** Top-of-file comment for
      future maintenance.

## Verification

- [x] All scenarios passing (coverage = 100% on new test)
- [x] `npm run typecheck -w @google/gemini-cli-core` green
- [x] `npm run lint -w @google/gemini-cli-core -- src/services/providerRegistry.ts src/services/providerRegistry.test.ts`
      green
- [x] No regressions in pre-existing tests
