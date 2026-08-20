import type { CanonicalContentType } from "@oraclerpg/schema";
import type { ImportDiagnostic } from "../../index.js";
import type { HomebrewCandidate, HomebrewIdPort, HomebrewImportInput, HomebrewSourceAdapter } from "../types.js";

const CONTENT_TYPES = new Set<CanonicalContentType>([
  "monster", "vehicle", "item", "spell", "feature", "class", "subclass", "species", "background", "rule", "table", "condition",
]);

interface OracleHomebrewEnvelope {
  format: "oraclerpg-homebrew";
  version: 1;
  systemId?: string;
  contents: readonly { type: CanonicalContentType; name: string; data: unknown; sourceId?: string; confidence?: number }[];
}

export class OracleJsonHomebrewAdapter implements HomebrewSourceAdapter {
  readonly kind = "ORACLE_JSON" as const;
  constructor(private readonly ids: HomebrewIdPort) {}

  canHandle(input: HomebrewImportInput): boolean {
    return input.source.kind === this.kind && (typeof input.payload === "string" || typeof input.payload === "object");
  }

  async parse(input: HomebrewImportInput): Promise<readonly HomebrewCandidate[]> {
    let parsed: unknown;
    try { parsed = typeof input.payload === "string" ? JSON.parse(input.payload) : input.payload; }
    catch {
      return [this.invalid("Invalid JSON", input)];
    }
    if (!isEnvelope(parsed)) return [this.invalid("Expected oraclerpg-homebrew version 1 envelope", input)];

    return parsed.contents.map((entry) => {
      const diagnostics: ImportDiagnostic[] = [];
      if (!CONTENT_TYPES.has(entry.type)) diagnostics.push({ severity: "error", code: "unknown_content_type", message: `Unknown content type ${String(entry.type)}` });
      if (!entry.name.trim()) diagnostics.push({ severity: "error", code: "missing_name", message: "Content name is required" });
      return {
        candidateId: this.ids.nextCandidateId(),
        type: entry.type,
        name: entry.name,
        data: entry.data,
        provenance: {
          sourceKind: this.kind,
          ...(entry.sourceId ? { sourceId: entry.sourceId } : {}),
          ...(input.source.sourceLabel ? { sourceLabel: input.source.sourceLabel } : {}),
          originalName: entry.name,
          confidence: clamp(entry.confidence ?? 0.95),
          aiAssisted: true,
        },
        diagnostics,
      };
    });
  }

  private invalid(message: string, input: HomebrewImportInput): HomebrewCandidate {
    return {
      candidateId: this.ids.nextCandidateId(),
      type: "rule",
      name: input.source.fileName ?? "Invalid Oracle JSON",
      data: {},
      provenance: { sourceKind: this.kind, confidence: 0, aiAssisted: true },
      diagnostics: [{ severity: "error", code: "invalid_oracle_json", message }],
    };
  }
}

function isEnvelope(value: unknown): value is OracleHomebrewEnvelope {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.format === "oraclerpg-homebrew" && record.version === 1 && Array.isArray(record.contents);
}
function clamp(value: number): number { return Math.max(0, Math.min(1, value)); }
