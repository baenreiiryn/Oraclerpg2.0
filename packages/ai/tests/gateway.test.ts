import assert from "node:assert/strict";
import test from "node:test";
import {
  AiGatewayError,
  AiProviderError,
  OracleAiGateway,
  type AiGatewayRoute,
  type AiGatewayUsageEvent,
  type AiProviderPort,
} from "../src/index.js";

const routes: readonly AiGatewayRoute[] = [
  {
    routeId: "story-primary",
    alias: "oracle-story",
    providerId: "provider-a",
    modelId: "model-story-a",
    priority: 1,
    capabilities: ["TEXT", "STRUCTURED"],
    authMode: "BYOK_OR_PLATFORM",
  },
  {
    routeId: "story-fallback",
    alias: "oracle-story",
    providerId: "provider-b",
    modelId: "model-story-b",
    priority: 2,
    capabilities: ["TEXT", "STRUCTURED"],
  },
  {
    routeId: "vision",
    alias: "oracle-vision",
    providerId: "provider-b",
    modelId: "model-vision",
    priority: 1,
    capabilities: ["TEXT", "VISION"],
  },
];

function request() {
  return {
    requestId: "req-1",
    alias: "oracle-story" as const,
    operation: "gm.narrate",
    input: "Describe the fortress hall.",
    requiredCapabilities: ["TEXT"] as const,
    campaignId: "campaign-1",
    actorId: "pc-1",
    userId: "user-1",
  };
}

test("stable Oracle alias routes without exposing provider/model in product response", async () => {
  const provider: AiProviderPort = {
    providerId: "provider-a",
    async generate() {
      return { output: "The hall is silent.", usage: { totalTokens: 12 } };
    },
  };
  const gateway = new OracleAiGateway({ routes, providers: [provider] });
  const response = await gateway.generate(request());

  assert.equal(response.alias, "oracle-story");
  assert.equal(response.output, "The hall is silent.");
  assert.equal("providerId" in response, false);
  assert.equal("modelId" in response, false);
});

test("retryable provider failure falls back by route priority", async () => {
  const calls: string[] = [];
  const providerA: AiProviderPort = {
    providerId: "provider-a",
    async generate() {
      calls.push("a");
      throw new AiProviderError("temporary outage", "unavailable", true);
    },
  };
  const providerB: AiProviderPort = {
    providerId: "provider-b",
    async generate() {
      calls.push("b");
      return { output: "fallback" };
    },
  };
  const gateway = new OracleAiGateway({ routes, providers: [providerA, providerB] });
  const response = await gateway.generate(request());

  assert.deepEqual(calls, ["a", "b"]);
  assert.equal(response.output, "fallback");
});

test("non-retryable provider error does not silently fall through", async () => {
  const calls: string[] = [];
  const providerA: AiProviderPort = {
    providerId: "provider-a",
    async generate() {
      calls.push("a");
      throw new AiProviderError("bad request", "bad_request", false);
    },
  };
  const providerB: AiProviderPort = {
    providerId: "provider-b",
    async generate() {
      calls.push("b");
      return { output: "should not run" };
    },
  };
  const gateway = new OracleAiGateway({ routes, providers: [providerA, providerB] });

  await assert.rejects(() => gateway.generate(request()), (error: unknown) => {
    return error instanceof AiProviderError && error.code === "bad_request";
  });
  assert.deepEqual(calls, ["a"]);
});

test("BYOK resolves server-side secret references and never places raw secret in request", async () => {
  let seenSecret = "";
  const provider: AiProviderPort = {
    providerId: "provider-a",
    async generate(input) {
      seenSecret = input.credential?.secret ?? "";
      assert.equal(JSON.stringify(input.request).includes("raw-secret"), false);
      return { output: "ok" };
    },
  };
  const gateway = new OracleAiGateway({
    routes,
    providers: [provider],
    secretResolver: {
      async resolve(ref) {
        assert.equal(ref.secretRef, "secret:user-1:provider-a");
        return { providerId: ref.providerId, secret: "raw-secret" };
      },
    },
  });

  const response = await gateway.generate({
    ...request(),
    auth: {
      mode: "BYOK",
      credentials: [{ providerId: "provider-a", secretRef: "secret:user-1:provider-a" }],
    },
  });
  assert.equal(response.output, "ok");
  assert.equal(seenSecret, "raw-secret");
  assert.equal(JSON.stringify(response).includes("raw-secret"), false);
});

test("quota rejection occurs before any provider call", async () => {
  let calls = 0;
  const provider: AiProviderPort = {
    providerId: "provider-a",
    async generate() {
      calls += 1;
      return { output: "no" };
    },
  };
  const gateway = new OracleAiGateway({
    routes,
    providers: [provider],
    quota: {
      async check() {
        return { allowed: false, reason: "daily quota reached" };
      },
    },
  });

  await assert.rejects(() => gateway.generate(request()), (error: unknown) => {
    return error instanceof AiGatewayError && error.code === "quota_exceeded";
  });
  assert.equal(calls, 0);
});

test("required capabilities remove incompatible routes before provider execution", async () => {
  const calls: string[] = [];
  const providerB: AiProviderPort = {
    providerId: "provider-b",
    async generate(input) {
      calls.push(input.route.routeId);
      return { output: "vision result" };
    },
  };
  const gateway = new OracleAiGateway({ routes, providers: [providerB] });
  const response = await gateway.generate({
    requestId: "vision-1",
    alias: "oracle-vision",
    operation: "vision.inspect",
    input: "image-ref:abc",
    requiredCapabilities: ["VISION"],
  });

  assert.equal(response.output, "vision result");
  assert.deepEqual(calls, ["vision"]);
});

test("usage sink receives provider/model metadata for server-side accounting only", async () => {
  const events: AiGatewayUsageEvent[] = [];
  const provider: AiProviderPort = {
    providerId: "provider-a",
    async generate() {
      return { output: "ok", usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 } };
    },
  };
  const gateway = new OracleAiGateway({
    routes,
    providers: [provider],
    usageSink: {
      async record(event) {
        events.push(event);
      },
    },
  });
  const response = await gateway.generate(request());

  assert.equal(events.length, 1);
  assert.equal(events[0]?.providerId, "provider-a");
  assert.equal(events[0]?.modelId, "model-story-a");
  assert.equal(response.usage.totalTokens, 15);
  assert.equal("providerId" in response, false);
});
