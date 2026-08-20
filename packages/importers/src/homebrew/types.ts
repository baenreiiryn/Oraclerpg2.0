import type { CanonicalContentType } from "@oraclerpg/schema";
import type { ImportDiagnostic } from "../index.js";

export type HomebrewSourceKind =
  | "FIVETOOLS_MARKDOWN"
  | "FOUNDRY_VTT"
  | "ORACLE_JSON"
  | "TEXT_ANALYSIS"
  | "MANUAL_CREATOR";

export interface HomebrewSourceDescriptor {
  kind: HomebrewSourceKind;
  fileName?: string;
  mimeType?: string;
  sourceLabel?: string;
}

export interface HomebrewImportInput {
  source: HomebrewSourceDescriptor;
  payload: string | unknown;
  systemId?: string;
}

export interface HomebrewProvenance {
  sourceKind: HomebrewSourceKind;
  sourceId?: string;
  sourceLabel?: string;
  originalName?: string;
  confidence: number;
  aiAssisted?: boolean;
}

export interface HomebrewCandidate {
  candidateId: string;
  type: CanonicalContentType;
  name: string;
  data: unknown;
  provenance: HomebrewProvenance;
  diagnostics: readonly ImportDiagnostic[];
}

export type HomebrewReviewStatus = "READY" | "NEEDS_REVIEW" | "REJECTED";

export interface HomebrewImportBatch {
  batchId: string;
  source: HomebrewSourceDescriptor;
  status: HomebrewReviewStatus;
  candidates: readonly HomebrewCandidate[];
  diagnostics: readonly ImportDiagnostic[];
}

export interface HomebrewSourceAdapter {
  readonly kind: HomebrewSourceKind;
  canHandle(input: HomebrewImportInput): boolean;
  parse(input: HomebrewImportInput): Promise<readonly HomebrewCandidate[]>;
}

export interface HomebrewCandidateValidatorPort {
  validate(candidate: HomebrewCandidate): Promise<readonly ImportDiagnostic[]>;
}

export interface HomebrewCandidateCanonicalizerPort {
  canonicalize(candidate: HomebrewCandidate): Promise<HomebrewCandidate>;
}

export interface HomebrewIdPort {
  nextBatchId(): string;
  nextCandidateId(): string;
}

export interface HomebrewTextAnalyzerPort {
  analyze(input: {
    text: string;
    systemId?: string;
  }): Promise<unknown>;
}
