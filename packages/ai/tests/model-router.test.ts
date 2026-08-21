import assert from "node:assert/strict";
import test from "node:test";
import { OracleModelRouter, type OracleAiGatewayRequest, type OracleAiGatewayResponse } from "../src/index.js";

function buildRouter() {
  const requests: OracleAiGatewayRequest[] = [];
  const gateway = {
    async generate(request: OracleAiGatewayRequest): Promise<OracleAiGatewayResponse> {
      requests.push(request);
      return { requestId: request.requestId, alias: request.alias, output: "ok", usage: {} };
    },
  };
  return { router: new OracleModelRouter({ gateway }), requests };
}

test("GM interpretation routes to reasoning without exposing provider/model", async () => {
  const { router, requests } = buildRouter();
  const result = await router.run({ requestId: "r1", operation: "gm.interpret-turn", input: "{}" });
  assert.equal(result.alias, "oracle-reasoning");
  assert.equal(requests[0]?.outputMode, "JSON");
  assert.deepEqual(requests[0]?.requiredCapabilities, ["STRUCTURED", "REASONING"]);
  assert.equal("providerId" in result, false);
  assert.equal("modelId" in result, false);
});

test("specialized operations select stable Oracle aliases", async () => {
  const { router } = buildRouter();
  assert.equal((await router.run({ requestId: "n", operation: "gm.narrate", input: "x" })).alias, "oracle-story");
  assert.equal((await router.run({ requestId: "b", operation: "character.backstory", input: "x" })).alias, "oracle-story");
  assert.equal((await router.run({ requestId: "m", operation: "memory.extract", input: "x" })).alias, "oracle-background");
  assert.equal((await router.run({ requestId: "v", operation: "vision.inspect", input: "x" })).alias, "oracle-vision");
  assert.equal((await router.run({ requestId: "e", operation: "embedding.generate", input: "x" })).alias, "oracle-embedding");
  assert.equal((await router.run({ requestId: "f", operation: "utility.fast-text", input: "x" })).alias, "oracle-fast");
});

test("caller may tune output budget but cannot select model alias", async () => {
  const { router, requests } = buildRouter();
  await router.run({ requestId: "r", operation: "gm.narrate", input: "x", maxOutputTokens: 333, temperature: 0.4 });
  assert.equal(requests[0]?.alias, "oracle-story");
  assert.equal(requests[0]?.maxOutputTokens, 333);
  assert.equal(requests[0]?.temperature, 0.4);
});

test("missing operation policy fails closed", async () => {
  const gateway = { async generate(): Promise<never> { throw new Error("should not run"); } };
  const router = new OracleModelRouter({ gateway, policies: [] });
  await assert.rejects(() => router.run({ requestId: "x", operation: "gm.narrate", input: "x" }), /No model policy/);
});
