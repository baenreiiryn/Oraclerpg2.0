import type { CanonicalContentType } from "@oraclerpg/schema";
import type { ImportDiagnostic } from "../../index.js";
import type { HomebrewCandidate, HomebrewIdPort, HomebrewImportInput, HomebrewSourceAdapter, HomebrewTextAnalyzerPort } from "../types.js";

interface AnalysisResult {
  contents?: readonly { type?: CanonicalContentType; name?: string; data?: unknown; confidence?: number; notes?: readonly string[] }[];
}

export class TextAnalysisHomebrewAdapter implements HomebrewSourceAdapter {
  readonly kind = "TEXT_ANALYSIS" as const;
  constructor(private readonly ids: HomebrewIdPort, private readonly analyzer: HomebrewTextAnalyzerPort) {}

  canHandle(input: HomebrewImportInput): boolean {
    return input.source.kind === this.kind && typeof input.payload === "string" && input.payload.trim().length > 0;
  }

  async parse(input: HomebrewImportInput): Promise<readonly HomebrewCandidate[]> {
    const analyzed = await this.analyzer.analyze({ text: String(input.payload), ...(input.systemId ? { systemId: input.systemId } : {}) }) as AnalysisResult;
    const contents = Array.isArray(analyzed?.contents) ? analyzed.contents : [];
    if (!contents.length) {
      return [{
        candidateId: this.ids.nextCandidateId(), type: "rule", name: input.source.sourceLabel ?? "Text analysis", data: {},
        provenance: { sourceKind: this.kind, confidence: 0, aiAssisted: true },
        diagnostics: [{ severity: "error", code: "analysis_empty", message: "AI analysis returned no importable content" }],
      }];
    }

    return contents.map((entry, index) => {
      const diagnostics: ImportDiagnostic[] = [];
      const type = entry.type ?? "rule";
      const name = entry.name?.trim() || `Analyzed content ${index + 1}`;
      const confidence = clamp(entry.confidence ?? 0.65);
      if (!entry.type) diagnostics.push({ severity: "warning", code: "analysis_missing_type", message: "AI did not determine a canonical content type" });
      if (confidence < 0.85) diagnostics.push({ severity: "warning", code: "analysis_low_confidence", message: "AI-derived content requires human review" });
      for (const note of entry.notes ?? []) diagnostics.push({ severity: "info", code: "analysis_note", message: note });
      return {
        candidateId: this.ids.nextCandidateId(), type, name, data: entry.data ?? {},
        provenance: {
          sourceKind: this.kind,
          ...(input.source.sourceLabel ? { sourceLabel: input.source.sourceLabel } : {}),
          originalName: name,
          confidence,
          aiAssisted: true,
        },
        diagnostics,
      };
    });
  }
}

function clamp(value: number): number { return Math.max(0, Math.min(1, value)); }
