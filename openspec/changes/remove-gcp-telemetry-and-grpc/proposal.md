## Why

The gemini-cli-core workspace currently depends on `@google-cloud/logging`,
`@google-cloud/opentelemetry-cloud-trace-exporter`,
`@google-cloud/opentelemetry-cloud-monitoring-exporter`, and `@grpc/grpc-js` for
telemetries (GCP log, trace, and metric monitoring exporters) and Agent-to-Agent
(A2A) gRPC client transport.

These packages introduce a massive dependency chain including `protobufjs` and
native gRPC components that:

- Complicate the packaging process of Single Executable Applications (SEA).
- Cause runtime failures on alternative JS runtimes like Bun (due to dynamic
  require checks in `protobufjs`).
- Are not needed for local execution since there is no dependency on Google's
  internal systems for running the CLI.

## What Changes

- **Telemetry Exporters**: Remove GCP telemetry exporters (`GcpTraceExporter`,
  `GcpMetricExporter`, `GcpLogExporter`) from `@google/gemini-cli-core`.
- **gRPC Transport**: Remove gRPC client transport and its dependencies
  (`@grpc/grpc-js`) from the codebase, leaving HTTP/REST-based transports intact
  for A2A or other utilities.
- **Dependency Cleanup**: Remove `@google-cloud/logging`,
  `@google-cloud/opentelemetry-cloud-trace-exporter`,
  `@google-cloud/opentelemetry-cloud-monitoring-exporter`, and `@grpc/grpc-js`
  from the dependency trees.

## Capabilities

### New Capabilities

- `gcp-telemetry-and-grpc-removal`: Removal of GCP log/trace/metric exporters
  and gRPC transport, simplifying the runtime, reducing package size, and
  ensuring Bun and Node SEA compatibility.

### Modified Capabilities

<!-- None -->

## Impact

- **Affected Code**: `packages/core/src/telemetry/gcp-exporters.ts` (to be
  removed), `packages/core/src/telemetry/sdk.ts` (remove GCP exporter
  instantiation), `packages/core/src/agents/a2a-client-manager.ts` (remove gRPC
  import and reference).
- **APIs**: The CLI will no longer support exporting logs, traces, or metrics
  directly to GCP endpoints (using OTLP HTTP collector will still be supported
  via HTTP-based OpenTelemetry exporters if they exist).
- **Dependencies**: Removes `@google-cloud/logging`,
  `@google-cloud/opentelemetry-cloud-monitoring-exporter`,
  `@google-cloud/opentelemetry-cloud-trace-exporter`, `@grpc/grpc-js`, and
  `@grpc/proto-loader`.
