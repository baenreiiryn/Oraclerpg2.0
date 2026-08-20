import type {
  AiGatewayAuth,
  AiGatewayCapability,
  AiGatewayUsage,
  OracleAiGatewayPort,
  OracleModelAlias,
} from "../gateway/types.js";

export type OracleAiOperation =
  | "gm.interpret-turn"
  | "gm.narrate"
  | "gm.npc-dialogue"
  | "memory.extract"
  | "memory.consolidate"
  | "session.summarize"
  | "retrieval.rerank"
  | "document.extract"
  | "world.extract-entities"
  | "vision.inspect"
  | "embedding.generate"
  | "utility.fast-text";

export interface OracleOperationPolicy {
  operation: OracleAiOperation;
  alias: OracleModelAlias;
  outputMode: "TEXT" | "JSON";
  requiredCapabilities: readonly AiGatewayCapability[];
  maxOutputTokens?: number;
  temperature?: number;
}

export interface OracleOperationRequest {
  requestId: string;
  operation: OracleAiOperation;
  input: string;
  system?: string;
  campaignId?: string;
  actorId?: string;
  userId?: string;
  tags?: readonly string[];
  auth?: AiGatewayAuth;
  maxOutputTokens?: number;
  temperature?: number;
}

/** Product-facing specialized operation result. Provider/model identity is absent. */
export interface OracleOperationResponse {
  requestId: string;
  operation: OracleAiOperation;
  alias: OracleModelAlias;
  output: string;
  structuredOutput?: unknown;
  usage: AiGatewayUsage;
}

export interface OracleAiOperationRouterPort {
  run(request: OracleOperationRequest): Promise<OracleOperationResponse>;
}

export interface OracleModelRouterDependencies {
  gateway: OracleAiGatewayPort;
  policies?: readonly OracleOperationPolicy[];
}
