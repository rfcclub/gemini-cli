# Implementation Plan: sovereign-boot

## Preparation

- [x] Review spec scenarios for sovereign-boot (6 requirements, 14 scenarios
      total)
- [x] Review existing ProviderRegistry
      (`packages/core/src/services/providerRegistry.ts`)
- [x] Review CLI entry point (`packages/cli/src/gemini.tsx`) for integration
      point
- [x] Verify `providers.yaml` parser uses `yaml` lib + `expandEnvVars`
      (reusable)
- [x] Verify `Storage.getGlobalGeminiDir()` resolves to `~/.gemini-vesta/`
      (sourced from session 2026-06-27)

## Tasks

### Task 1: VestaConfig — types + loader

**Files:**

- Create: `packages/core/src/config/vestaConfig.ts`
- Test: `packages/core/src/config/vestaConfig.test.ts`

- [ ] **Step 1: Write failing tests**

  ```ts
  import { loadVestaConfig } from './vestaConfig.js';
  import * as fs from 'node:fs';
  import * as path from 'node:path';
  import * as os from 'node:os';

  describe('loadVestaConfig', () => {
    let tmpDir: string;
    beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vesta-cfg-')); });
    afterEach(() => { fs.rmSync(tmpDir, { recursive: true }); });

    it('returns null when config.yaml does not exist', async () => {
      vi.spyOn(Storage, 'getGlobalGeminiDir').mockReturnValue(tmpDir);
      expect(await loadVestaConfig()).toBeNull();
    });

    it('parses valid config with all fields', async () => {
      fs.writeFileSync(path.join(tmpDir, 'config.yaml'),
        'defaultModel: groq/llama-3.1-70b
  defaultProvider: groq
  geminiApiKey: test-key
  ');
      vi.spyOn(Storage, 'getGlobalGeminiDir').mockReturnValue(tmpDir);
      const cfg = await loadVestaConfig();
      expect(cfg).toEqual({ defaultModel: 'groq/llama-3.1-70b', defaultProvider: 'groq', geminiApiKey: 'test-key' });
    });

    it('throws VestaConfigParseError on malformed YAML', async () => {
      fs.writeFileSync(path.join(tmpDir, 'config.yaml'), '{ malformed: yaml: ::: }');
      vi.spyOn(Storage, 'getGlobalGeminiDir').mockReturnValue(tmpDir);
      await expect(loadVestaConfig()).rejects.toThrow(VestaConfigParseError);
    });

    it('warns when permissions are loose and geminiApiKey is set', async () => {
      const configPath = path.join(tmpDir, 'config.yaml');
      fs.writeFileSync(configPath, 'geminiApiKey: secret
  ');
      fs.chmodSync(configPath, 0o644);
      const warnSpy = vi.spyOn(debugLogger, 'warn');
      vi.spyOn(Storage, 'getGlobalGeminiDir').mockReturnValue(tmpDir);
      await loadVestaConfig();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('chmod 600'));
    });
  });
  ```

  Run: `npm test -w @google/gemini-cli-core -- src/config/vestaConfig.test.ts`
  Expected: FAIL (module doesn't exist)

- [ ] **Step 2: Implement**

  ```ts
  // packages/core/src/config/vestaConfig.ts
  import * as fs from 'node:fs/promises';
  import * as path from 'node:path';
  import { Storage } from './storage.js';
  import { parseYaml } from '../utils/yaml.js';
  import { debugLogger } from '../utils/debugLogger.js';

  export interface VestaConfig {
    defaultModel?: string;
    defaultProvider?: string;
    geminiApiKey?: string;
  }

  export class VestaConfigParseError extends Error {
    constructor(
      message: string,
      public readonly cause?: unknown,
    ) {
      super(`Failed to parse config.yaml: ${message}`);
      this.name = 'VestaConfigParseError';
    }
  }

  export async function loadVestaConfig(): Promise<VestaConfig | null> {
    const globalDir = Storage.getGlobalGeminiDir();
    const configPath = path.join(globalDir, 'config.yaml');
    try {
      const stat = await fs.stat(configPath);
      const content = await fs.readFileSync(configPath, 'utf8');
      const parsed = parseYaml<VestaConfig>(content);
      if (parsed?.geminiApiKey && (stat.mode & 0o777) !== 0o600) {
        const actual = (stat.mode & 0o777).toString(8).padStart(4, '0');
        debugLogger.warn(
          `WARN: config.yaml contains API key but permissions are ${actual}. Run: chmod 600 ~/.gemini-vesta/config.yaml`,
        );
      }
      return parsed ?? null;
    } catch (e: any) {
      if (e.code === 'ENOENT') return null;
      throw new VestaConfigParseError(e.message, e);
    }
  }
  ```

  Run: `npm test -w @google/gemini-cli-core -- src/config/vestaConfig.test.ts`
  Expected: PASS

- [ ] **Step 3: Typecheck + lint**
  ```bash
  npm run typecheck && npm run lint
  ```
  Expected: green

### Task 2: DefaultModelResolver

**Files:**

- Create: `packages/core/src/services/defaultModelResolver.ts`
- Test: `packages/core/src/services/defaultModelResolver.test.ts`

- [ ] **Step 1: Write failing tests** — 5 scenarios covering env, config,
      catalog, fallback, error

- [ ] **Step 2: Implement `resolveDefaultModel()` with 4-tier priority**

  ```ts
  export type ResolutionSource = 'env' | 'config' | 'catalog' | 'fallback' | 'gemini-default';
  export interface ResolvedModel { provider: string; model: string; source: ResolutionSource; }
  export class NoProvidersConfiguredError extends Error { ... }

  export async function resolveDefaultModel(opts?: {
    envOverride?: string;  // testability
    configOverride?: VestaConfig | null;
    registryOverride?: ProviderRegistry;
  }): Promise<ResolvedModel> {
    // 1. env VESTA_DEFAULT_MODEL → parse "provider/model"
    // 2. config.defaultModel → parse
    // 3. catalog first provider's first availableModels[0]
    // 4. fallback warning + first provider's first model
    // 5. throw NoProvidersConfiguredError
  }
  ```

- [ ] **Step 3: Verify all 5 scenarios pass**

### Task 3: ProviderRegistry — opt-in Gemini

**Files:**

- Modify: `packages/core/src/services/providerRegistry.ts`
- Test: `packages/core/src/services/providerRegistry.optInGemini.test.ts`

- [ ] **Step 1: Write failing test** — Gemini NOT registered when GEMINI_API_KEY
      absent

- [ ] **Step 2: Refactor `loadFromGlobalConfig()`**

  ```ts
  async loadFromGlobalConfig(): Promise<void> {
    // existing provider loading
    // AFTER: if (process.env.GEMINI_API_KEY) {
    //   this.registerProvider('gemini', {
    //     type: 'google', apiKey: process.env.GEMINI_API_KEY, defaultModel: 'gemini-2.5-pro'
    //   });
    // }
  }
  ```

- [ ] **Step 3: Verify backward compat test** — with key, Gemini appears

- [ ] **Step 4: Ensure existing 4 unit tests still pass**

### Task 4: CLI flag --provider + VESTA_DEFAULT_MODEL env wiring

**Files:**

- Modify: `packages/cli/src/config/config.ts` (parseArguments)
- Test: `packages/cli/src/config/config.providerFlag.test.ts`

- [ ] **Step 1: Write failing test** — `--provider groq` produces argv.provider
      = "groq"

- [ ] **Step 2: Add flag to parseArguments**

  ```ts
  .option('provider', {
    type: 'string',
    description: 'Override default provider for this invocation',
  })
  ```

- [ ] **Step 3: Verify backward compat — old flag set still works**

### Task 5: Boot integration in gemini.tsx

**Files:**

- Modify: `packages/cli/src/gemini.tsx`
- Test: `packages/cli/src/gemini.boot.test.tsx`

- [ ] **Step 1: Write failing integration test** — boot without GEMINI_API_KEY
      succeeds

- [ ] **Step 2: Inject resolver call before loadCliConfig**

  ```ts
  // After argv resolution, before loadCliConfig:
  const resolved = await resolveDefaultModel();
  if (argv.provider) {
    if (!providerRegistry.getProvider(argv.provider)) {
      const available = [...providerRegistry.getAllProviders().keys()].join(
        ', ',
      );
      writeToStderr(`Unknown provider '${argv.provider}'. Available: ${available}
  `);
      process.exit(ExitCodes.FATAL_CONFIG_ERROR);
    }
    debugLogger.log(`INFO: --provider flag active: ${argv.provider}`);
  }
  debugLogger.log(
    `INFO: Default model resolved: ${resolved.provider}/${resolved.model} (source: ${resolved.source})`,
  );
  ```

- [ ] **Step 3: Verify test passes; existing tests intact**

### Task 6: Integration test — E2E boot

**Files:**

- Create: `integration-tests/sovereign-boot.test.ts`

- [ ] **Step 1: Use existing integration test patterns** (cp.
      `integration-tests/file-system.test.ts`)

  ```ts
  it('boots without GEMINI_API_KEY with providers.yaml only', async () => {
    // Spawn gemini-vesta --version with env unset
    // Assert exit 0
  });

  it('boots full sequence with --prompt', async () => {
    // Assert stdout contains "Default model resolved:"
  });
  ```

- [ ] **Step 2: Run integration test** — `npm run test:e2e -- sovereign-boot`

### Task 7: Documentation

**Files:**

- Create/Modify: `docs/cli/sovereign-boot.md` (or add to existing configuration
  doc)

- [ ] **Step 1: Document config.yaml schema with examples**
- [ ] **Step 2: Document resolution priority chain**
- [ ] **Step 3: Document --provider flag and VESTA_DEFAULT_MODEL env**
- [ ] **Step 4: Activate `docs-writer` skill if complex**

## Verification

- [ ] All 14 spec scenarios have passing tests
- [ ] `.loomkit-verify.json` shows coverage = 100%
- [ ] `npm run test` green (excluding pre-existing gitService.test.ts failures)
- [ ] `npm run typecheck` green
- [ ] `npm run lint` green
- [ ] `npm run test:e2e -- sovereign-boot` green
- [ ] Manual verification: `unset GEMINI_API_KEY && gemini-vesta --version`
      exits 0
- [ ] Manual verification: boot log shows correct source tag

## Risk Mitigation Checklist

- [ ] Backward compat: existing `GEMINI_API_KEY` users see identical behavior
      (Task 3 Step 3)
- [ ] No regression: `npm test -w @google/gemini-cli-core` all green (excluding
      known failures)
- [ ] Empty state: clear error message when no providers (Task 2 fallback
      scenario)
- [ ] Permission: warn on 0644 with API key (Task 1 test)
- [ ] Provider flag: clear error on unknown provider (Task 5)

## Rollback Plan

If catastrophic regression: `git revert` entire change set; provider resolution
reverts to hardcoded Gemini.
