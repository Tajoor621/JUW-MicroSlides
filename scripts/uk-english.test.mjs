import test from "node:test";
import assert from "node:assert/strict";
import { sourceTextNodes, toUK } from "./uk-english.mjs";
test("UK prose checks flag visible US text and retain required code tokens", () => {
  assert(sourceTextNodes("x.tsx", 'const label = "Color";').length);
  assert(sourceTextNodes("x.tsx", 'const label = "Font license unavailable";').length);
  assert(sourceTextNodes("x.tsx", "const view = <span>Center</span>;").length);
  assert.equal(
    sourceTextNodes(
      "x.tsx",
      'import x from "./color.ts"; const style={color:"red",align:"center"};',
    ).length,
    0,
  );
  assert.equal(sourceTextNodes("x.tsx", 'const file="fonts/LICENSE.txt";').length, 0);
  assert.equal(
    toUK("Organize the program and analyze behavior."),
    "Organise the programme and analyse behaviour.",
  );
});
