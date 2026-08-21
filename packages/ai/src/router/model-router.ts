import type {
  OracleAiOperation,
  OracleModelRouterDependencies,
  OracleOperationPolicy,
  OracleOperationRequest,
  OracleOperationResponse,
} from "./types.js";

export const DEFAULT_OPERATION_POLICIES: readonly OracleOperationPolicy[] = [
  { operation: "gm.interpret-turn", alias: "oracle-reasoning", outputMode: "JSON", requiredCapabilities: ["STRUCTURED", "REASONING"], maxOutputTokens: 1400, temperature: 0.2 },
  { operation: "gm.narrate", alias: "oracle-story", outputMode: "TEXT", requiredCapabilities: ["TEXT"], maxOutputTokens: 1200, temperature: 0.8 },
  { operation: "gm.npc-dialogue", alias: "oracle-story", outputMode: "TEXT", requiredCapabilities: ["TEXT"], maxOutputTokens: 900, temperature: 0.9 },
  { operation: "character.backstory", alias: "oracle-story", outputMode: "TEXT", requiredCapabilities: ["TEXT"], maxOutputTokens: 1400, temperature: 0.8 },
  { operation: "memory.extract", alias: "oracle-background", outputMode: "JSON", requiredCapabilities: ["STRUCTURED"], maxOutputTokens: 900, temperature: 0 },
  { operation: "memory.consolidate", alias: "oracle-background", outputMode: "JSON", requiredCapabilities: ["STRUCTURED"], maxOutputTokens: 900, temperature: 0 },
  { operation: "session.summarize", alias: "oracle-background", outputMode: "JSON", requiredCapabilities: ["STRUCTURED"], maxOutputTokens: 1200, temperature: 0.1 },
  { operation: "retrieval.rerank", alias: "oracle-fast", outputMode: "JSON", requiredCapabilities: ["STRUCTURED"], maxOutputTokens: 700, temperature: 0 },
  { operation: "document.extract", alias: "oracle-background", outputMode: "JSON", requiredCapabilities: ["STRUCTURED"], maxOutputTokens: 1200, temperature: 0 },
  { operation: "world.extract-entities", alias: "oracle-background", outputMode: "JSON", requiredCapabilities: ["STRUCTURED"], maxOutputTokens: 1000, temperature: 0 },
  { operation: "vision.inspect", alias: "oracle-vision", outputMode: "JSON", requiredCapabilities: ["VISION", "STRUCTURED"], maxOutputTokens: 1200, temperature: 0.1 },
  { operation: "embedding.generate", alias: "oracle-embedding", outputMode: "JSON", requiredCapabilities: ["EMBEDDING"], maxOutputTokens: 1, temperature: 0 },
  { operation: "utility.fast-text", alias: "oracle-fast", outputMode: "TEXT", requiredCapabilities: ["TEXT"], maxOutputTokens: 600, temperature: 0.2 },
];

export class OracleModelRouter {
  private readonly policies = new Map<OracleAiOperation, OracleOperationPolicy>();

  constructor(private readonly deps: OracleModelRouterDependencies) {
    for (const policy of deps.policies ?? DEFAULT_OPERATION_POLICIES) {
      if (this.policies.has(policy.operation)) throw new Error(`Duplicate operation policy: ${policy.operation}`);
      this.policies.set(policy.operation, policy);
    }
  }

  async run(request: OracleOperationRequest): Promise<OracleOperationResponse> {
    const policy = this.policies.get(request.operation);
    if (!policy) throw new Error(`No model policy configured for operation ${request.operation}`);
    const maxOutputTokens = request.maxOutputTokens ?? policy.maxOutputTokens;
    const temperature = request.temperature ?? policy.temperature;

    const response = await this.deps.gateway.generate({
      requestId: request.requestId,
      alias: policy.alias,
      operation: request.operation,
      input: request.input,
      outputMode: policy.outputMode,
      requiredCapabilities: policy.requiredCapabilities,
      ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
      ...(request.system ? { system: request.system } : {}),
      ...(request.campaignId ? { campaignId: request.campaignId } : {}),
      ...(request.actorId ? { actorId: request.actorId } : {}),
      ...(request.userId ? { userId: request.userId } : {}),
      ...(request.tags ? { tags: request.tags } : {}),
      ...(request.auth ? { auth: request.auth } : {}),
    });

    return {
      requestId: response.requestId,
      operation: request.operation,
      alias: response.alias,
      output: response.output,
      ...(response.structuredOutput !== undefined ? { structuredOutput: response.structuredOutput } : {}),
      usage: response.usage,
    };
  }
}
