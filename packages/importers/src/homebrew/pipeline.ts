import type { ImportDiagnostic } from "../index.js";
import type {
  CanonicalHomebrewCandidate,
  HomebrewCandidateValidatorPort,
  HomebrewCanonicalizerPort,
  HomebrewIdPort,
  HomebrewImportBatch,
  HomebrewImportInput,
  HomebrewSourceAdapter,
} from "./types.js";

export class HomebrewImportPipeline {
  constructor(
    private readonly adapters: readonly HomebrewSourceAdapter[],
    private readonly canonicalizer: HomebrewCanonicalizerPort,
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
    const candidates: CanonicalHomebrewCandidate[] = [];
    const diagnostics: ImportDiagnostic[] = [];

    for (const candidate of parsed) {
      const canonical = await this.canonicalizer.canonicalize(candidate, input);
      const validation = await this.validator.validate(canonical);
      const merged = { ...canonical, diagnostics: [...canonical.diagnostics, ...validation] };
      candidates.push(merged);
      diagnostics.push(...merged.diagnostics);
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

/** Useful for source formats already carrying Oracle canonical data (not Foundry/Markdown by default). */
export class IdentityHomebrewCanonicalizer implements HomebrewCanonicalizerPort {
  async canonicalize(candidate: Parameters<HomebrewCanonicalizerPort["canonicalize"]>[0], input: HomebrewImportInput): Promise<CanonicalHomebrewCandidate> {
    return { ...candidate, canonicalized: true, ...(input.systemId ? { systemId: input.systemId } : {}) };
  }
}

export class SequentialHomebrewIds implements HomebrewIdPort {
  private batch = 0;
  private candidate = 0;
  nextBatchId(): string { this.batch += 1; return `homebrew-batch-${this.batch}`; }
  nextCandidateId(): string { this.candidate += 1; return `homebrew-candidate-${this.candidate}`; }
}
