## Context

The current `gemini-cli-core` codebase contains telemetry exporters to Google
Cloud Platform (Logging, Tracing, Monitoring) and a gRPC-based Agent-to-Agent
(A2A) client transport. These introduce heavy and platform-specific dependencies
like `@grpc/grpc-js` and `@google-cloud/logging` (which transitively pulls in
`protobufjs`). These dependencies break single-executable bundling, crash under
alternative runtimes like Bun, and are not required for local development and
private CLI deployments.

## Goals / Non-Goals

**Goals:**

- Completely remove GCP logging, monitoring, and tracing telemetry code from
  `@google/gemini-cli-core`.
- Completely remove `@grpc/grpc-js` and the corresponding gRPC A2A transport
  code.
- Clean up `packages/core/package.json` to purge these unused dependencies.
- Ensure the bundle size is minimized and has zero dependencies on `protobufjs`
  or C++ native gRPC bindings.
- Achieve 100% compatibility with Bun packaging (`bun build --compile`).

**Non-Goals:**

- Removing HTTP/REST-based A2A communication, which will remain active and
  usable.
- Removing core local telemetry features (like file logging or console tracing)
  that do not depend on GCP.

## Decisions

### Decision 1: Remove `gcp-exporters.ts` and modify `sdk.ts`

- **Choice**: Delete `gcp-exporters.ts` and remove any references to GCP
  exporters in `sdk.ts`.
- **Rationale**: Telemetry exports to GCP are only relevant for Google
  internal/enterprise deployments, not local developer execution.
- **Alternatives Considered**:
  - _Dynamic imports_: Keeping the files but loading them dynamically would
    still require packaging the dependencies in standard bundlers.
  - _Conditional compilation_: Harder to maintain and would still require
    managing these packages in `package.json`.

### Decision 2: Remove gRPC A2A Client Transport

- **Choice**: Remove `GrpcTransportFactory` import and references from
  `a2a-client-manager.ts`.
- **Rationale**: Local agent-to-agent operations can work over HTTP/REST instead
  of gRPC. Dropping gRPC removes `@grpc/grpc-js`, avoiding C++ native modules
  compilation issues.
- **Alternatives Considered**:
  - _Move gRPC transport to an optional package_: Unnecessary complexity for the
    current scope.

## Risks / Trade-offs

- **[Risk]** Telemetry setup for Google Cloud projects will fail or throw errors
  if users try to enable GCP telemetry.
  - _Mitigation_: Ensure `sdk.ts` handles the `TelemetryTarget.GCP` target
    gracefully (e.g., by logging a warning/debug message or falling back to
    standard OTLP HTTP if configured, or simply ignoring it).
- **[Risk]** A2A grpc transport configuration in user settings will crash.
  - _Mitigation_: Gracefully handle attempts to use gRPC transport in
    `a2a-client-manager.ts` by throwing a clear error stating that gRPC
    transport is not supported in this build.
