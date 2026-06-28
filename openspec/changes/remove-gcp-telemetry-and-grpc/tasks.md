## 1. Purge GCP Telemetry Exporters

- [ ] 1.1 Delete `packages/core/src/telemetry/gcp-exporters.ts` and
      `packages/core/src/telemetry/gcp-exporters.test.ts`
- [ ] 1.2 Modify `packages/core/src/telemetry/sdk.ts` to remove imports of
      `GcpTraceExporter`, `GcpMetricExporter`, `GcpLogExporter` and handle
      `TelemetryTarget.GCP` target gracefully (by skipping direct GCP export and
      showing warning/logs)
- [ ] 1.3 Fix any other imports or test mocks in
      `packages/core/src/telemetry/sdk.test.ts` that refer to GCP telemetry
      classes

## 2. Purge gRPC Client Transport

- [ ] 2.1 Modify `packages/core/src/agents/a2a-client-manager.ts` to remove
      `@grpc/grpc-js` and `GrpcTransportFactory` imports and references
- [ ] 2.2 Add graceful error throwing or fallback if the user configures the
      agent to use `grpc` transport

## 3. Clean up package.json dependencies

- [ ] 3.1 Remove GCP logging, monitoring, trace, and gRPC dependencies from
      `packages/core/package.json`
- [ ] 3.2 Run `npm install` to prune `node_modules` and update
      `package-lock.json`

## 4. Verification and Rebuild

- [ ] 4.1 Run typecheck (`npm run typecheck`) and tests (`npm run test`) to
      verify the codebase compiles and passes successfully
- [ ] 4.2 Build bundle (`npm run bundle`) and verify Bun compilation
      (`bun build bundle/gemini.js --compile --outfile dist/gemini-bun`) and
      execution (`./dist/gemini-bun --version`)
