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
export * from "./homebrew/types.js";
export * from "./homebrew/pipeline.js";
export * from "./homebrew/canonicalizer.js";
export * from "./homebrew/sources/oracle-json.js";
export * from "./homebrew/sources/foundry.js";
export * from "./homebrew/sources/fiveetools-markdown.js";
export * from "./homebrew/sources/text-analysis.js";
