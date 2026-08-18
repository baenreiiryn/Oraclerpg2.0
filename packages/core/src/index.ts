export type GameSystemId = string;
export type RulesVersionId = string;
export type ContentSourceId = string;

export interface SystemRef {
  gameSystem: GameSystemId;
  rulesVersion: RulesVersionId;
}

export interface SourceRef {
  sourceId: ContentSourceId;
  book?: string;
  page?: number;
  license?: string;
  licenseUrl?: string;
}

export interface Provenance {
  origin: "oracle" | "import" | "user";
  provider?: string;
  sourceKey?: string;
  importedAt?: string;
  sourceHash?: string;
  adapterVersion?: string;
  mapperVersion?: string;
}

export interface RelationRef {
  type: string;
  targetCanonicalId: string;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface EntityMetadata {
  tags?: readonly string[];
  createdAt?: string;
  updatedAt?: string;
  deprecated?: boolean;
}

export interface OracleEntity<TData = unknown> {
  id: string;
  canonicalId: string;
  entityType: string;
  name: string;
  system: SystemRef;
  source: SourceRef;
  provenance: Provenance;
  schemaVersion: number;
  data: TData;
  relations: readonly RelationRef[];
  metadata: EntityMetadata;
}
