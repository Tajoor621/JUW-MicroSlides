import test from "node:test";
import assert from "node:assert/strict";
import { contrastRatio } from "../src/lib/colour-contrast.ts";
import { SLIDE_THEMES, themeOf, accessibleTheme } from "../src/lib/slide-themes.ts";
test("theme text colours meet AA normal-text contrast on both slide surfaces, including dark export", () => {
  assert.equal(contrastRatio("#000000", "#FFFFFF"), 21);
  for (const id of SLIDE_THEMES) {
    const theme = themeOf(id);
    const variants = [
      theme,
      accessibleTheme({
        ...theme,
        slide: "#0B1520",
        band: "#17344C",
        ink: "#F1F5F9",
        navy: "#FFFFFF",
        muted: "#C5D6E8",
      }),
    ];
    for (const t of variants)
      for (const role of ["ink", "navy", "muted", "accent"])
        for (const bg of ["slide", "band"])
          assert(contrastRatio(t[role], t[bg]) >= 4.5, `${id} ${role} on ${bg}`);
  }
});
