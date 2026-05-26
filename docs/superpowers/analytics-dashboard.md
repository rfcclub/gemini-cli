# Analytics Dashboard

Analytics Dashboard is a premium, real-time terminal statistics panel that
visualizes token usage density, cache hit efficiency, and equivalent API cost
savings during your development sessions. This dashboard is rendered directly in
the terminal using React Ink.

Understanding token expenditure and caching efficiency can be difficult with dry
text outputs. The Analytics Dashboard aggregates statistics and renders visual
meters to show caching performance.

---

## How It Works

The dashboard tracks session metrics statefully and outputs clean diagnostic
panels.

1. **Session Telemetry Collection:** During your terminal session, the core
   telemetry engine logs every token event to a temporary PID-based file at
   `/tmp/gemini-vesta-telemetry-${process.pid}.json`.
2. **Pricing Model Resolution:** The engine reads dynamic cost-per-million rates
   based on the active Gemini model (Pro vs. Flash) to calculate standard API
   costs.
3. **Visual Render:** When triggered, a premium 3-column Ink layout renders
   Ascii flame graphics, cache hit gauges, and dollar metrics in HSL-themed TUI
   boxes.
4. **Automated Cleanup:** On session exit, the temporary PID-based JSON store is
   automatically deleted to keep your system clean.

---

## Interactive Command

You can view the real-time session diagnostics using a single CLI command.

To view your active session's statistics, run:

```bash
gemini-vesta stats
```

The command outputs a styled horizontal statistics card showcasing:

- **Athanor Heat:** A color-coded gauge showing active cache hits and TTL.
- **Token Forge:** An exact breakdown of input, output, and cached tokens.
- **Economic Impact:** Standard cost vs. actual cost and total dollar savings.
