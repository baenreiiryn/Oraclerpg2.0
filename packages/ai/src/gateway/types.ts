export type OracleModelAlias =
  | "oracle-fast"
  | "oracle-story"
  | "oracle-reasoning"
  | "oracle-vision"
  | "oracle-background"
  | "oracle-embedding";

export type AiGatewayCapability =
  | "TEXT"
  | "STRUCTURED"
  | "REASONING"
  | "VISION"
  | "EMBEDDING";

export interface AiGatewayUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
}

export interface AiGatewayCredentialRef {
  providerId: string;
  secretRef: string;
}

export type AiGatewayAuth =
  | { mode: "PLATFORM" }
  | { mode: "BYOK"; credentials: readonly AiGatewayCredentialRef[] };

export interface OracleAiGatewayRequest {
  requestId: string;
  alias: OracleModelAlias;
  operation: string;
  input: string;
  system?: string;
  outputMode?: "TEXT" | "JSON";
  requiredCapabilities?: readonly AiGatewayCapability[];
  maxOutputTokens?: number;
  temperature?: number;
  campaignId?: string;
  actorId?: string;
  userId?: string;
  tags?: readonly string[];
  auth?: AiGatewayAuth;
}

/** Product-facing result. Provider/model identity is deliberately absent. */
export interface OracleAiGatewayResponse {
  requestId: string;
  alias: OracleModelAlias;
  output: string;
  structuredOutput?: unknown;
  finishReason?: "STOP" | "LENGTH" | "CONTENT_FILTER" | "ERROR" | "OTHER";
  usage: AiGatewayUsage;
}

/** Server-side route configuration. Provider/model names must not be exposed to product contracts. */
export interface AiGatewayRoute {
  routeId: string;
  alias: OracleModelAlias;
  providerId: string;
  modelId: string;
  priority: number;
  enabled?: boolean;
  capabilities: readonly AiGatewayCapability[];
  authMode?: "PLATFORM" | "BYOK_OR_PLATFORM" | "BYOK_ONLY";
}

export interface AiGatewayProviderResult {
  output: string;
  structuredOutput?: unknown;
  finishReason?: OracleAiGatewayResponse["finishReason"];
  usage?: AiGatewayUsage;
}

export interface AiResolvedCredential {
  providerId: string;
  secret: string;
}

export interface AiProviderGenerateInput {
  route: AiGatewayRoute;
  request: OracleAiGatewayRequest;
  credential?: AiResolvedCredential;
}

export interface AiProviderPort {
  providerId: string;
  generate(input: AiProviderGenerateInput): Promise<AiGatewayProviderResult>;
}

export interface AiSecretResolverPort {
  resolve(input: AiGatewayCredentialRef): Promise<AiResolvedCredential>;
}

export interface AiQuotaDecision {
  allowed: boolean;
  reason?: string;
}

export interface AiQuotaPort {
  check(input: {
    requestId: string;
    alias: OracleModelAlias;
    campaignId?: string;
    actorId?: string;
    userId?: string;
    requestedMaxOutputTokens?: number;
  }): Promise<AiQuotaDecision>;
}

export interface AiGatewayUsageEvent {
  requestId: string;
  alias: OracleModelAlias;
  routeId: string;
  providerId: string;
  modelId: string;
  success: boolean;
  usage?: AiGatewayUsage;
  errorCode?: string;
  campaignId?: string;
  actorId?: string;
  userId?: string;
  tags?: readonly string[];
}

export interface AiUsageSinkPort {
  record(event: AiGatewayUsageEvent): Promise<void>;
}

export interface OracleAiGatewayPort {
  generate(request: OracleAiGatewayRequest): Promise<OracleAiGatewayResponse>;
}
