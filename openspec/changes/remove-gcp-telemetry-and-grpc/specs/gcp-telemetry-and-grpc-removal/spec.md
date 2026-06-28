## REMOVED Requirements

### Requirement: GCP Logging Telemetry

**Reason**: Decoupling local execution from Google's logging systems and
resolving dependency bundle issues (like `protobufjs` crash on Bun).
**Migration**: Local debugging should use standard console loggers or file-based
logging if needed.

#### Scenario: Running telemetry without GCP Logging

- **WHEN** telemetry is initialized in local development
- **THEN** system SHALL NOT attempt to export to GCP Logging

### Requirement: GCP Trace Telemetry

**Reason**: Decoupling trace exporter from GCP tracing and reducing native gRPC
bundle complexity. **Migration**: Standard OpenTelemetry OTLP HTTP/JSON
exporters can be used if remote tracing is required.

#### Scenario: Running trace without GCP Trace Exporter

- **WHEN** tracer is started in the CLI
- **THEN** system SHALL NOT instantiate GcpTraceExporter

### Requirement: GCP Monitoring Telemetry

**Reason**: Removing GCP metric monitoring export dependency. **Migration**:
Metrics can be checked via local telemetry consoles or simple console logging in
debug mode.

#### Scenario: Telemetry execution without GcpMetricExporter

- **WHEN** telemetry system is active
- **THEN** system SHALL NOT export metrics to Google Cloud Monitoring

### Requirement: A2A gRPC Transport

**Reason**: Removing the C++ native node-gyp gRPC library dependencies
(`@grpc/grpc-js`) which complicate packaging. **Migration**: Use HTTP/REST-based
transport protocols for Agent-to-Agent communication.

#### Scenario: Connecting to A2A client

- **WHEN** client tries to connect to an agent
- **THEN** system SHALL NOT resolve or initialize GrpcTransportFactory
