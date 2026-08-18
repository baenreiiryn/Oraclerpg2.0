export type ImportSeverity = "error" | "warning" | "info";

export interface ImportDiagnostic {
  severity: ImportSeverity;
  code: string;
  path?: string;
  message: string;
  sourceValue?: unknown;
}

export interface ImportResult<T> {
  value?: T;
  diagnostics: readonly ImportDiagnostic[];
}

export * from "./audit.js";

// Source-specific adapters will live under src/sources/<provider>/.
// They may depend on canonical schemas; canonical schemas must never depend on them.
