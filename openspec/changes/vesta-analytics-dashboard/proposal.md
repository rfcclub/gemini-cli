## Why

Developers lack visibility into prompt token density, context caching
performance, and session-level API costs. Although other CLIs (like Claude Code)
print raw token counts, they do so in dry, textual layouts.

Gemini-Vesta can build a stunning, interactive, and highly premium **Vesta
Analytics Dashboard** directly in the terminal using React Ink. It will show a
real-time "Athanor Heat Meter" (cache hit ratios), detailed token segmentations
(input, output, cached), and a live "Forge Savings" ticker (API dollars saved),
providing an unmatched developer experience that is visually rewarding and
highly functional.

## What Changes

- **CLI Dashboard View (`VestaDashboard`)**: Implement an interactive, beautiful
  terminal dashboard component in `packages/cli` that maps current session
  telemetry.
- **Telemetry Store Upgrades**: Enhance the telemetry storage in `packages/core`
  to record cumulative session stats (total tokens sent, received, cached, and
  equivalent dollar costs).
- **Interactive Command**: Add a new sub-command `gemini-vesta stats` (or
  dashboard keys) to render the full panel during development.

## Capabilities

### New Capabilities

- `analytics-dashboard`: An interactive React Ink dashboard displaying token
  segmentation, cache hits, and USD savings using premium styled widgets.

### Modified Capabilities

_(None)_

## Impact

- **CLI Package (`packages/cli`)**: Custom Ink layouts, boxes, and charts.
- **Core Package (`packages/core`)**: Aggregates usage parameters across all
  model invocations.
