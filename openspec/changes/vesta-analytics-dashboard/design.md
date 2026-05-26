## Context

Developers need clear, premium-quality visual feedback on session efficiency.
This design introduces a telemetry storage engine in `packages/core` and a
multi-column visual dashboard component inside `packages/cli`.

## Goals / Non-Goals

**Goals:**

- Implement stateful session token tracking by logging statistics to a transient
  PID-based JSON file.
- Build a beautiful multi-column `VestaDashboardView` in the Ink terminal layer.
- Bind the command `gemini-vesta stats` to trigger dashboard output.

**Non-Goals:**

- Uploading telemetry data to an external cloud database (data remains local and
  private).

## Decisions

### 1. PID-based Transient Telemetry Store

- **Context**: Session state must be preserved across multi-step execution
  commands within the same CLI run.
- **Decision**: Persist telemetry data to
  `/tmp/gemini-vesta-telemetry-${process.pid}.json`. On clean exit, read the
  data to print a final summary and delete the file.
- **Rationale**: File-based locking with PID ensures isolation between
  concurrent CLI sessions in different terminal tabs.

### 2. Multi-Column Premium Ink Layout

- **Decision**: Design a 3-column horizontal box layout:
  - **Left Column**: "Athanor Status" featuring an ASCII spark/fire and a
    dynamic cache hit gauge.
  - **Center Column**: "Token Forge" showing a tabular breakdown of input,
    output, and cached tokens.
  - **Right Column**: "Economic Impact" showing actual cost vs. estimated
    savings in USD.
- **Rationale**: Implements Vesta's rich aesthetic guidelines, using vibrant HSL
  colors (green/teal for hits, cyan for savings, yellow for standard tokens).

### 3. CLI Sub-command & Input Routing

- **Decision**: Update the CLI router to capture the `stats` argument. When
  executed, it reads the telemetry store and renders the dashboard directly,
  bypasses the main agent loop, and exits cleanly.

## Risks / Trade-offs

- **Risk: Cost model inaccuracies**
  - _Description_: Standard Gemini pricing varies by model (Flash vs. Pro) and
    can change over time.
  - _Mitigation_: We SHALL introduce a lookup table in
    `packages/core/src/config/models.ts` that defines pricing per 1M tokens
    specifically for each model variant, preventing hardcoded generic values.
