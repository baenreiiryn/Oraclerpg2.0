import type { CanonicalContentType } from "@oraclerpg/schema";
import type { ImportDiagnostic } from "../../index.js";
import type { HomebrewCandidate, HomebrewIdPort, HomebrewImportInput, HomebrewSourceAdapter } from "../types.js";

export class FiveToolsMarkdownHomebrewAdapter implements HomebrewSourceAdapter {
  readonly kind = "FIVETOOLS_MARKDOWN" as const;
  constructor(private readonly ids: HomebrewIdPort) {}

  canHandle(input: HomebrewImportInput): boolean {
    return input.source.kind === this.kind && typeof input.payload === "string" && input.payload.trim().length > 0;
  }

  async parse(input: HomebrewImportInput): Promise<readonly HomebrewCandidate[]> {
    const markdown = String(input.payload);
    const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? input.source.fileName?.replace(/\.md$/i, "") ?? "Untitled Homebrew";
    const explicitType = markdown.match(/<!--\s*oracle:type=([a-z]+)\s*-->/i)?.[1]?.toLowerCase();
    const inference = inferType(markdown, explicitType);
    const diagnostics: ImportDiagnostic[] = [];
    if (inference.confidence < 0.85) {
      diagnostics.push({ severity: "warning", code: "markdown_type_inference", message: `Content type inferred as '${inference.type}' with limited confidence; review before import` });
    }

    return [{
      candidateId: this.ids.nextCandidateId(),
      type: inference.type,
      name: title,
      data: {
        name: title,
        sourceText: markdown,
        sections: parseSections(markdown),
        tables: parseTables(markdown),
        tags: [...markdown.matchAll(/\{@([a-zA-Z]+)\s+([^}]+)\}/g)].map((match) => ({ tag: match[1], value: match[2] })),
      },
      provenance: {
        sourceKind: this.kind,
        ...(input.source.sourceLabel ? { sourceLabel: input.source.sourceLabel } : {}),
        originalName: title,
        confidence: inference.confidence,
      },
      diagnostics,
    }];
  }
}

function inferType(markdown: string, explicit?: string): { type: CanonicalContentType; confidence: number } {
  const valid: CanonicalContentType[] = ["monster", "vehicle", "item", "spell", "feature", "class", "subclass", "species", "background", "rule", "table", "condition"];
  if (explicit && valid.includes(explicit as CanonicalContentType)) return { type: explicit as CanonicalContentType, confidence: 1 };
  const text = markdown.toLowerCase();
  if (text.includes("**casting time:**") && text.includes("**range:**") && text.includes("**duration:**")) return { type: "spell", confidence: 0.96 };
  if (text.includes("**armor class**") && text.includes("**hit points**") && (text.includes("challenge") || text.includes("proficiency bonus"))) return { type: "monster", confidence: 0.93 };
  if (/^##\s+class features/im.test(markdown) || text.includes("hit point die")) return { type: "class", confidence: 0.88 };
  if (text.includes("prerequisite:") || text.includes("feature")) return { type: "feature", confidence: 0.68 };
  if (text.includes("weapon") || text.includes("armor") || text.includes("wondrous item")) return { type: "item", confidence: 0.7 };
  return { type: "rule", confidence: 0.45 };
}

function parseSections(markdown: string): readonly { level: number; title: string; body: string }[] {
  const lines = markdown.split(/\r?\n/);
  const sections: { level: number; title: string; body: string }[] = [];
  let current: { level: number; title: string; lines: string[] } | undefined;
  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      if (current) sections.push({ level: current.level, title: current.title, body: current.lines.join("\n").trim() });
      current = { level: heading[1]!.length, title: heading[2]!.trim(), lines: [] };
    } else if (current) current.lines.push(line);
  }
  if (current) sections.push({ level: current.level, title: current.title, body: current.lines.join("\n").trim() });
  return sections;
}

function parseTables(markdown: string): readonly string[][][] {
  const lines = markdown.split(/\r?\n/);
  const tables: string[][][] = [];
  let rows: string[][] = [];
  const flush = () => { if (rows.length >= 2) tables.push(rows); rows = []; };
  for (const line of lines) {
    if (/^\s*\|.*\|\s*$/.test(line)) rows.push(line.trim().slice(1, -1).split("|").map((cell) => cell.trim()));
    else flush();
  }
  flush();
  return tables;
}
