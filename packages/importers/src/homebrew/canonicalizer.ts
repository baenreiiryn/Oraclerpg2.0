import type { CanonicalHomebrewCandidate, HomebrewCandidate, HomebrewCanonicalizerPort, HomebrewImportInput } from "./types.js";

/**
 * Conservative default: Oracle JSON and AI text-analysis are expected to target the Oracle schema.
 * Foundry/5etools source-shaped data is staged for review unless a richer game-system canonicalizer replaces this port.
 */
export class ConservativeHomebrewCanonicalizer implements HomebrewCanonicalizerPort {
  async canonicalize(candidate: HomebrewCandidate, input: HomebrewImportInput): Promise<CanonicalHomebrewCandidate> {
    const needsMapping = candidate.provenance.sourceKind === "FOUNDRY_VTT" || candidate.provenance.sourceKind === "FIVETOOLS_MARKDOWN";
    return {
      ...candidate,
      canonicalized: true,
      ...(input.systemId ? { systemId: input.systemId } : {}),
      diagnostics: needsMapping
        ? [...candidate.diagnostics, {
            severity: "warning" as const,
            code: "source_mapping_review",
            message: "Source structure was parsed successfully, but system-specific canonical mapping must be reviewed before persistence",
          }]
        : candidate.diagnostics,
    };
  }
}
