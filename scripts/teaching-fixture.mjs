/** Synthetic software fixture only. No scientific approval or real provider lookup is represented. */
export async function teachingFixture(vite) {
  const { generateLocalDeck } = await vite.ssrLoadModule("/src/lib/generate-deck.ts");
  const { reconcileDeck } = await vite.ssrLoadModule("/src/lib/deck-integrity.ts");
  const { teachingSchema } = await vite.ssrLoadModule("/src/lib/teaching-schema.ts");
  const { surfaceItems, surfaceSnapshot, attestClaim } = await vite.ssrLoadModule(
    "/src/lib/surface-review.ts",
  );
  const d = reconcileDeck(
    generateLocalDeck({
      topic: "Enzyme immobilization",
      discipline: "Industrial microbiology",
      level: "Undergraduate",
      mode: "manual",
      notes: "",
      count: 1,
    }),
  );
  d.preparedBy = "Synthetic test instructor";
  const s = d.slides[0];
  s.title = "Controlled software fixture";
  s.subtitle = "";
  s.bullets = ["Synthetic experimental result for software validation."];
  s.leftBullets = [];
  s.rightBullets = [];
  s.notes = "";
  s.media = [];
  const quote =
    "Synthetic software fixture only: activity recovery was 80 % under a controlled test condition. This is not a scientific result.";
  const url = "https://pubmed.ncbi.nlm.nih.gov/999999999/";
  s.citations = [
    {
      id: "synthetic-primary",
      pmid: "999999999",
      url,
      title: "Synthetic software fixture, not a scientific paper",
      authors: "Test Author",
      journal: "Software fixture",
      year: "2026",
      evidenceKind: "primary",
      publicationCheck: {
        identifier: "999999999",
        checkedAt: Date.now(),
        status: "no-notice-found",
        providers: ["Synthetic software fixture"],
        notices: [],
        complete: true,
        metadataMatch: true,
        metadataTitle: "Synthetic software fixture, not a scientific paper",
      },
    },
  ];
  d.sourceDocuments = [
    {
      id: "synthetic-source",
      title: "Synthetic software fixture",
      url,
      publisher: "Synthetic fixture only",
      access: "full-text",
      text: quote,
      locator: "Test paragraph",
      license: "Synthetic fixture only",
      retrievedAt: Date.now(),
      publishedDate: "2026",
      jurisdiction: "",
      acquisition: "lecturer-import",
    },
  ];
  s.teaching = teachingSchema.parse({
    definition: "A controlled software fixture.",
    diagram: "adsorption",
    diagramLabel: "Adsorption template",
    altText: "Conceptual enzyme adsorption schematic; not to scale.",
    takeaway: "Validate the software gate, not scientific truth.",
    quantitative: [
      {
        metric: "Synthetic activity recovery",
        value: "80",
        units: "%",
        conditions: "Controlled synthetic test",
        sourceUrl: url,
        quote,
      },
    ],
  });
  const { reconcileClaims } = await vite.ssrLoadModule("/src/lib/deck-integrity.ts");
  s.claims = reconcileClaims(s).claims.map((c) =>
    attestClaim(d, {
      ...c,
      status: "lecturer-reviewed",
      reviewedAt: Date.now(),
      evidence: [
        {
          sourceUrl: url,
          citationId: "synthetic-primary",
          locator: "Test paragraph",
          quote,
          access: "full-text",
          checkedAt: Date.now(),
        },
      ],
    }),
  );
  const { teachingDeckSnapshot } = await vite.ssrLoadModule("/src/lib/teaching-verification.ts");
  function review() {
    s.surfaceReviews = surfaceItems(s).map((item) => ({
      field: item.field,
      snapshot: surfaceSnapshot(d, s, item.field),
      verdict: "supported",
      rationale: "Controlled synthetic software fixture only; not scientific review.",
      reviewedAt: Date.now(),
      sourceUrl: url,
      quote,
      locator: "Test paragraph",
    }));
    d.teachingVerification = {
      instructor: "Synthetic test instructor",
      at: Date.now(),
      snapshot: teachingDeckSnapshot(d),
    };
  }
  review();
  return { deck: d, slide: s, review, quote, url };
}
