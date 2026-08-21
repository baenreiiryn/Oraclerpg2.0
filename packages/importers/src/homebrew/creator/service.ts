import type { ImportDiagnostic } from "../../index.js";
import type {
  CanonicalHomebrewCandidate,
  HomebrewCandidate,
  HomebrewCandidateValidatorPort,
  HomebrewCanonicalizerPort,
  HomebrewIdPort,
  HomebrewImportBatch,
  HomebrewImportInput,
} from "../types.js";
import type { HomebrewCreatorDraft } from "./types.js";

export class HomebrewCreatorService {
  constructor(
    private readonly canonicalizer: HomebrewCanonicalizerPort,
    private readonly validator: HomebrewCandidateValidatorPort,
    private readonly ids: HomebrewIdPort,
  ) {}

  async stageDraft(draft: HomebrewCreatorDraft): Promise<HomebrewImportBatch> {
    const source = { kind: "MANUAL_CREATOR" as const, sourceLabel: "OracleRPG Homebrew Creator" };
    const input: HomebrewImportInput = {
      source,
      payload: draft.data,
      ...(draft.systemId ? { systemId: draft.systemId } : {}),
    };
    const candidate: HomebrewCandidate = {
      candidateId: this.ids.nextCandidateId(),
      type: draft.type,
      name: draft.name,
      data: draft.data,
      provenance: {
        sourceKind: "MANUAL_CREATOR",
        confidence: 1,
        aiAssisted: false,
        ...(draft.sourceId ? { sourceId: draft.sourceId } : {}),
        originalName: draft.name,
      },
      diagnostics: [],
    };

    const canonical = await this.canonicalizer.canonicalize(candidate, input);
    const validation = await this.validator.validate(canonical);
    const merged: CanonicalHomebrewCandidate = {
      ...canonical,
      diagnostics: [...canonical.diagnostics, ...validation],
    };
    const diagnostics: ImportDiagnostic[] = [...merged.diagnostics];
    const hasError = diagnostics.some((item) => item.severity === "error");
    const hasWarning = diagnostics.some((item) => item.severity === "warning");

    return {
      batchId: this.ids.nextBatchId(),
      source,
      status: hasError ? "REJECTED" : hasWarning ? "NEEDS_REVIEW" : "READY",
      candidates: [merged],
      diagnostics,
    };
  }
}
