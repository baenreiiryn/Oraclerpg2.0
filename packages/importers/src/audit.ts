export type CompatibilityStatus = "supported" | "partial" | "unsupported" | "empty";

export interface CompatibilityFieldIssue {
  sourcePath: string;
  status: Exclude<CompatibilityStatus, "empty">;
  targetPath?: string;
  reason?: string;
  sourceValue?: unknown;
}

export interface CompatibilityAuditReport {
  provider: string;
  sourceFormat: string;
  sourceVersion?: string;
  detectedEntityTypes: readonly string[];
  entityCount: number;
  status: CompatibilityStatus;
  issues: readonly CompatibilityFieldIssue[];
  notes: readonly string[];
}

/**
 * Describes an audit-only pass over an external payload.
 * Implementations MUST NOT persist entities, create relationships, or mutate compendia.
 */
export interface CompatibilityAuditor<TSource = unknown> {
  readonly provider: string;
  canAudit(source: unknown): source is TSource;
  audit(source: TSource): CompatibilityAuditReport;
}

export interface FiveEToolsSublistEnvelope {
  fileType: string;
  siteVersion?: string;
  items: readonly unknown[];
  sources: readonly unknown[];
  saveId?: string;
}

export function auditFiveEToolsSublistEnvelope(source: FiveEToolsSublistEnvelope): CompatibilityAuditReport {
  const entityType = source.fileType.replace(/-sublist$/, "");
  const entityCount = source.items.length;
  const version = source.siteVersion ? { sourceVersion: source.siteVersion } : {};

  if (entityCount === 0) {
    return {
      provider: "5etools",
      sourceFormat: source.fileType,
      ...version,
      detectedEntityTypes: [entityType],
      entityCount,
      status: "empty",
      issues: [],
      notes: [
        "The file is a 5etools sublist envelope but contains no entity payloads.",
        "No canonical field-coverage decision can be made until at least one item is present."
      ]
    };
  }

  return {
    provider: "5etools",
    sourceFormat: source.fileType,
    ...version,
    detectedEntityTypes: [entityType],
    entityCount,
    status: "partial",
    issues: [],
    notes: [
      "Payload items are present but require a source-family-specific auditor before compatibility can be declared."
    ]
  };
}
