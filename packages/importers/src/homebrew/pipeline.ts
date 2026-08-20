import type { ImportDiagnostic } from "../index.js";
import type {
  HomebrewCandidate,
  HomebrewCandidateValidatorPort,
  HomebrewIdPort,
  HomebrewImportBatch,
  HomebrewImportInput,
  HomebrewSourceAdapter,
} from "./types.js";

export class HomebrewImportPipeline {
  constructor(
    private readonly adapters: readonly HomebrewSourceAdapter[],
    private readonly validator: HomebrewCandidateValidatorPort,
    private readonly ids: HomebrewIdPort,
  ) {}

  async stage(input: HomebrewImportInput): Promise<HomebrewImportBatch> {
    const adapter = this.adapters.find((candidate) => candidate.kind === input.source.kind && candidate.canHandle(input));
    if (!adapter) {
      return {
        batchId: this.ids.nextBatchId(),
        source: input.source,
        status: "REJECTED",
        candidates: [],
        diagnostics: [{ severity: "error", code: "unsupported_source", message: `No adapter can handle ${input.source.kind}` }],
      };
    }

    const parsed = await adapter.parse(input);
    const candidates: HomebrewCandidate[] = [];
    const diagnostics: ImportDiagnostic[] = [];

    for (const candidate of parsed) {
      const validation = await this.validator.validate(candidate);
      candidates.push({ ...candidate, diagnostics: [...candidate.diagnostics, ...validation] });
      diagnostics.push(...candidate.diagnostics, ...validation);
    }

    const hasError = diagnostics.some((item) => item.severity === "error");
    const hasWarning = diagnostics.some((item) => item.severity === "warning");
    const lowConfidence = candidates.some((candidate) => candidate.provenance.confidence < 0.85);

    return {
      batchId: this.ids.nextBatchId(),
      source: input.source,
      status: hasError ? "REJECTED" : hasWarning || lowConfidence ? "NEEDS_REVIEW" : "READY",
      candidates,
      diagnostics,
    };
  }
}

export class SequentialHomebrewIds implements HomebrewIdPort {
  private batch = 0;
  private candidate = 0;
  nextBatchId(): string { this.batch += 1; return `homebrew-batch-${this.batch}`; }
  nextCandidateId(): string { this.candidate += 1; return `homebrew-candidate-${this.candidate}`; }
}
