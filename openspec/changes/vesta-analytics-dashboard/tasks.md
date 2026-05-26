## 1. Stateful Telemetry Store

- [ ] 1.1 Create the `TelemetryStore` class under
      `packages/core/src/telemetry/telemetryStore.ts` writing state to PID-based
      JSON files.
- [ ] 1.2 Implement lookup tables mapping model pricing configurations (Pro vs.
      Flash) to standard per-million costs.
- [ ] 1.3 Add unit tests checking telemetry accumulation, pricing lookup
      correctness, and automated file cleanup.

## 2. CLI View & Routing

- [ ] 2.1 Build the `VestaDashboardView.tsx` visual interface under
      `packages/cli/src/ui/components/` using Ink React.
- [ ] 2.2 Implement the premium 3-column UI layout, styling panels with
      harmonious HSL colors and ASCII widgets.
- [ ] 2.3 Register the `stats` sub-command inside CLI input routers
      (`packages/cli/src/commands/`).

## 3. Telemetry Integration & Validation

- [ ] 3.1 Hook the core agent loops to write turn-level token details to
      `TelemetryStore` after every API response.
- [ ] 3.2 Add integration tests verifying `gemini-vesta stats` fetches local
      telemetry and renders the dashboard successfully.
