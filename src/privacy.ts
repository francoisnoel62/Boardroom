// Loaded before graph/client imports by every entry point. Inherited developer
// flags are not human consent to publish project content to telemetry services.
process.env.LANGSMITH_TRACING = 'false';
process.env.LANGCHAIN_TRACING = 'false';
process.env.LANGCHAIN_TRACING_V2 = 'false';
process.env.OTEL_SDK_DISABLED = 'true';

export class PublicError extends Error {}

/** Display only intentional product diagnostics, never SDK/OS/JSON/argument bodies. */
export function publicDiagnostic(error: unknown): string {
  return error instanceof PublicError ? error.message : 'Operation failed. Check inputs, local storage and credential availability.';
}
