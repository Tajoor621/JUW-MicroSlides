import test from "node:test";
import assert from "node:assert/strict";
import { jsonThinkingPreference, LOCAL_AI_JSON_BUDGET_MS } from "../src/lib/local-ai-policy.ts";

test("structured drafting uses only advertised thinking controls and a bounded CPU budget", () => {
  assert.equal(
    jsonThinkingPreference({ thinking: { values: [true, false], default: true } }),
    false,
  );
  assert.equal(jsonThinkingPreference({ thinking: { values: [false] } }), false);
  assert.equal(jsonThinkingPreference({ thinking: { values: ["low", "medium", "high"] } }), "low");
  for (const input of [
    null,
    {},
    { thinking: { values: [true] } },
    { thinking: { values: ["medium", "high"] } },
    { thinking: { values: "false" } },
  ])
    assert.equal(jsonThinkingPreference(input), undefined);
  assert.equal(LOCAL_AI_JSON_BUDGET_MS, 180_000);
});
