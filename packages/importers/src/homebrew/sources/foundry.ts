import type { CanonicalContentType } from "@oraclerpg/schema";
import type { ImportDiagnostic } from "../../index.js";
import type { HomebrewCandidate, HomebrewIdPort, HomebrewImportInput, HomebrewSourceAdapter } from "../types.js";

export class FoundryVttHomebrewAdapter implements HomebrewSourceAdapter {
  readonly kind = "FOUNDRY_VTT" as const;
  constructor(private readonly ids: HomebrewIdPort) {}

  canHandle(input: HomebrewImportInput): boolean {
    return input.source.kind === this.kind && (typeof input.payload === "string" || typeof input.payload === "object");
  }

  async parse(input: HomebrewImportInput): Promise<readonly HomebrewCandidate[]> {
    let parsed: unknown;
    try { parsed = typeof input.payload === "string" ? JSON.parse(input.payload) : input.payload; }
    catch {
      return [this.invalid(input, "Foundry payload is not valid JSON")];
    }

    const docs = unwrapDocuments(parsed);
    if (!docs.length) return [this.invalid(input, "No Foundry documents were found")];

    return docs.map((doc) => this.convert(doc, input));
  }

  private convert(doc: Record<string, unknown>, input: HomebrewImportInput): HomebrewCandidate {
    const name = typeof doc.name === "string" && doc.name.trim() ? doc.name : "Unnamed Foundry content";
    const foundryType = typeof doc.type === "string" ? doc.type : "";
    const inferred = inferCanonicalType(foundryType, doc);
    const diagnostics: ImportDiagnostic[] = [];
    if (inferred.confidence < 0.85) diagnostics.push({ severity: "warning", code: "foundry_type_inference", message: `Foundry type '${foundryType || "unknown"}' requires review` });

    return {
      candidateId: this.ids.nextCandidateId(),
      type: inferred.type,
      name,
      data: normalizeFoundryDocument(doc),
      provenance: {
        sourceKind: this.kind,
        ...(typeof doc._id === "string" ? { sourceId: doc._id } : {}),
        ...(input.source.sourceLabel ? { sourceLabel: input.source.sourceLabel } : {}),
        originalName: name,
        confidence: inferred.confidence,
      },
      diagnostics,
    };
  }

  private invalid(input: HomebrewImportInput, message: string): HomebrewCandidate {
    return {
      candidateId: this.ids.nextCandidateId(), type: "rule", name: input.source.fileName ?? "Invalid Foundry export", data: {},
      provenance: { sourceKind: this.kind, confidence: 0 },
      diagnostics: [{ severity: "error", code: "invalid_foundry_export", message }],
    };
  }
}

function unwrapDocuments(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];
  for (const key of ["items", "documents", "entries", "data"]) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate.filter(isRecord);
  }
  return [value];
}

function inferCanonicalType(foundryType: string, doc: Record<string, unknown>): { type: CanonicalContentType; confidence: number } {
  const t = foundryType.toLowerCase();
  if (t === "spell") return { type: "spell", confidence: 0.98 };
  if (["weapon", "equipment", "consumable", "tool", "loot", "container", "backpack"].includes(t)) return { type: "item", confidence: 0.95 };
  if (t === "class") return { type: "class", confidence: 0.98 };
  if (t === "subclass") return { type: "subclass", confidence: 0.98 };
  if (t === "background") return { type: "background", confidence: 0.98 };
  if (["race", "species"].includes(t)) return { type: "species", confidence: 0.95 };
  if (["feat", "feature", "classfeature", "subclassfeature"].includes(t)) return { type: "feature", confidence: 0.9 };
  if (["npc", "monster"].includes(t) || doc.documentName === "Actor") return { type: "monster", confidence: 0.72 };
  return { type: "rule", confidence: 0.45 };
}

function normalizeFoundryDocument(doc: Record<string, unknown>): unknown {
  return {
    name: doc.name,
    foundryType: doc.type,
    system: doc.system ?? {},
    effects: doc.effects ?? [],
    flags: doc.flags ?? {},
  };
}
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
