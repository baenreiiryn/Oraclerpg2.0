import type {
  AiGatewayCredentialRef,
  AiGatewayProviderResult,
  AiGatewayRoute,
  AiProviderPort,
  AiQuotaPort,
  AiResolvedCredential,
  AiSecretResolverPort,
  AiUsageSinkPort,
  OracleAiGatewayPort,
  OracleAiGatewayRequest,
  OracleAiGatewayResponse,
} from "./types.js";

export class AiGatewayError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable = true,
  ) {
    super(message);
  }
}

export interface OracleAiGatewayOptions {
  routes: readonly AiGatewayRoute[];
  providers: readonly AiProviderPort[];
  secretResolver?: AiSecretResolverPort;
  quota?: AiQuotaPort;
  usageSink?: AiUsageSinkPort;
}

export class OracleAiGateway implements OracleAiGatewayPort {
  private readonly providers = new Map<string, AiProviderPort>();

  constructor(private readonly options: OracleAiGatewayOptions) {
    for (const provider of options.providers) {
      if (this.providers.has(provider.providerId)) {
        throw new AiGatewayError(`duplicate provider ${provider.providerId}`, "duplicate_provider");
      }
      this.providers.set(provider.providerId, provider);
    }
  }

  async generate(request: OracleAiGatewayRequest): Promise<OracleAiGatewayResponse> {
    this.assertRequest(request);
    await this.assertQuota(request);

    const routes = this.routesFor(request);
    if (routes.length === 0) {
      throw new AiGatewayError(`no route available for alias ${request.alias}`, "no_route");
    }

    let lastError: unknown;
    for (const route of routes) {
      const provider = this.providers.get(route.providerId);
      if (!provider) continue;

      let credential: AiResolvedCredential | undefined;
      try {
        credential = await this.resolveCredential(request, route);
        const result = await provider.generate({
          route,
          request,
          ...(credential ? { credential } : {}),
        });
        await this.recordUsage(request, route, true, result);
        return this.publicResponse(request, result);
      } catch (error) {
        lastError = error;
        const providerError = normalizeProviderError(error);
        await this.recordFailure(request, route, providerError);
        if (!providerError.retryable) throw providerError;
      }
    }

    if (lastError instanceof Error) {
      throw new AiGatewayError(`all routes failed: ${lastError.message}`, "all_routes_failed");
    }
    throw new AiGatewayError("all routes failed", "all_routes_failed");
  }

  private routesFor(request: OracleAiGatewayRequest): AiGatewayRoute[] {
    const required = new Set(request.requiredCapabilities ?? []);
    return this.options.routes
      .filter((route) => route.alias === request.alias && route.enabled !== false)
      .filter((route) => [...required].every((capability) => route.capabilities.includes(capability)))
      .filter((route) => this.routeSupportsAuth(route, request))
      .sort((a, b) => a.priority - b.priority || a.routeId.localeCompare(b.routeId));
  }

  private routeSupportsAuth(route: AiGatewayRoute, request: OracleAiGatewayRequest): boolean {
    const authMode = route.authMode ?? "PLATFORM";
    const requestMode = request.auth?.mode ?? "PLATFORM";
    if (authMode === "PLATFORM") return requestMode === "PLATFORM";
    if (authMode === "BYOK_ONLY") return requestMode === "BYOK" && this.credentialRefFor(request, route.providerId) !== undefined;
    return requestMode === "PLATFORM" || this.credentialRefFor(request, route.providerId) !== undefined;
  }

  private async resolveCredential(
    request: OracleAiGatewayRequest,
    route: AiGatewayRoute,
  ): Promise<AiResolvedCredential | undefined> {
    if (request.auth?.mode !== "BYOK") return undefined;
    const ref = this.credentialRefFor(request, route.providerId);
    if (!ref) throw new AiProviderError(`missing BYOK credential for ${route.providerId}`, "missing_byok", false);
    if (!this.options.secretResolver) {
      throw new AiProviderError("BYOK secret resolver is not configured", "secret_resolver_missing", false);
    }
    const credential = await this.options.secretResolver.resolve(ref);
    if (credential.providerId !== route.providerId || !credential.secret) {
      throw new AiProviderError("resolved credential does not match route", "invalid_credential", false);
    }
    return credential;
  }

  private credentialRefFor(request: OracleAiGatewayRequest, providerId: string): AiGatewayCredentialRef | undefined {
    if (request.auth?.mode !== "BYOK") return undefined;
    return request.auth.credentials.find((credential) => credential.providerId === providerId);
  }

  private async assertQuota(request: OracleAiGatewayRequest): Promise<void> {
    if (!this.options.quota) return;
    const decision = await this.options.quota.check({
      requestId: request.requestId,
      alias: request.alias,
      ...(request.campaignId ? { campaignId: request.campaignId } : {}),
      ...(request.actorId ? { actorId: request.actorId } : {}),
      ...(request.userId ? { userId: request.userId } : {}),
      ...(request.maxOutputTokens !== undefined ? { requestedMaxOutputTokens: request.maxOutputTokens } : {}),
    });
    if (!decision.allowed) {
      throw new AiGatewayError(decision.reason ?? "AI quota exceeded", "quota_exceeded");
    }
  }

  private async recordUsage(
    request: OracleAiGatewayRequest,
    route: AiGatewayRoute,
    success: boolean,
    result: AiGatewayProviderResult,
  ): Promise<void> {
    if (!this.options.usageSink) return;
    await this.options.usageSink.record({
      requestId: request.requestId,
      alias: request.alias,
      routeId: route.routeId,
      providerId: route.providerId,
      modelId: route.modelId,
      success,
      ...(result.usage ? { usage: result.usage } : {}),
      ...(request.campaignId ? { campaignId: request.campaignId } : {}),
      ...(request.actorId ? { actorId: request.actorId } : {}),
      ...(request.userId ? { userId: request.userId } : {}),
      ...(request.tags ? { tags: request.tags } : {}),
    });
  }

  private async recordFailure(
    request: OracleAiGatewayRequest,
    route: AiGatewayRoute,
    error: AiProviderError,
  ): Promise<void> {
    if (!this.options.usageSink) return;
    await this.options.usageSink.record({
      requestId: request.requestId,
      alias: request.alias,
      routeId: route.routeId,
      providerId: route.providerId,
      modelId: route.modelId,
      success: false,
      errorCode: error.code,
      ...(request.campaignId ? { campaignId: request.campaignId } : {}),
      ...(request.actorId ? { actorId: request.actorId } : {}),
      ...(request.userId ? { userId: request.userId } : {}),
      ...(request.tags ? { tags: request.tags } : {}),
    });
  }

  private publicResponse(request: OracleAiGatewayRequest, result: AiGatewayProviderResult): OracleAiGatewayResponse {
    return {
      requestId: request.requestId,
      alias: request.alias,
      output: result.output,
      ...(result.structuredOutput !== undefined ? { structuredOutput: result.structuredOutput } : {}),
      ...(result.finishReason ? { finishReason: result.finishReason } : {}),
      usage: result.usage ?? {},
    };
  }

  private assertRequest(request: OracleAiGatewayRequest): void {
    if (!request.requestId.trim()) throw new AiGatewayError("requestId is required", "invalid_request");
    if (!request.operation.trim()) throw new AiGatewayError("operation is required", "invalid_request");
    if (!request.input.trim()) throw new AiGatewayError("input is required", "invalid_request");
    if (request.maxOutputTokens !== undefined && (!Number.isInteger(request.maxOutputTokens) || request.maxOutputTokens <= 0)) {
      throw new AiGatewayError("maxOutputTokens must be a positive integer", "invalid_request");
    }
    if (request.temperature !== undefined && (!Number.isFinite(request.temperature) || request.temperature < 0 || request.temperature > 2)) {
      throw new AiGatewayError("temperature must be between 0 and 2", "invalid_request");
    }
    if (request.auth?.mode === "BYOK" && request.auth.credentials.length === 0) {
      throw new AiGatewayError("BYOK requires at least one credential reference", "invalid_request");
    }
  }
}

function normalizeProviderError(error: unknown): AiProviderError {
  if (error instanceof AiProviderError) return error;
  if (error instanceof Error) return new AiProviderError(error.message, "provider_error", true);
  return new AiProviderError("unknown provider error", "provider_error", true);
}
