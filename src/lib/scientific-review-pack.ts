import type { Deck, Claim, Citation, MediaItem } from "./types";
export type ReviewField = {
  slide: number;
  field: string;
  text: string;
  citations?: Citation[];
  claims?: Claim[];
  media?: MediaItem;
};
export function reviewFields(deck: Pick<Deck, "slides">): ReviewField[] {
  const items: ReviewField[] = [];
  for (const [index, slide] of deck.slides.entries()) {
    for (const field of ["title", "subtitle", "notes"] as const)
      if (slide[field]?.trim())
        items.push({
          slide: index + 1,
          field,
          text: slide[field]!,
          citations: slide.citations ?? [],
        });
    for (const field of ["bullets", "leftBullets", "rightBullets"] as const)
      for (const [n, text] of (slide[field] ?? []).entries())
        if (text.trim())
          items.push({
            slide: index + 1,
            field: `${field}.${n}`,
            text,
            claims: (slide.claims ?? []).filter((c) => c.text === text),
            citations: slide.citations ?? [],
          });
    for (const [n, media] of (slide.media ?? []).entries())
      items.push({ slide: index + 1, field: `media.${n}`, text: media.title, media });
  }
  return items;
}
export async function sha256(value: unknown) {
  const bytes = new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function makeScientificReviewPack(deck: Deck, raw = JSON.stringify(deck, null, 2)) {
  const items = await Promise.all(
    reviewFields(deck).map(async (item, i) => ({
      id: `item-${String(i + 1).padStart(4, "0")}`,
      ...item,
      contentHash: await sha256(item),
    })),
  );
  const content = {
    schema: "juw-scientific-review-1",
    createdAt: new Date().toISOString(),
    deckHash: await sha256(raw),
    topic: deck.topic,
    slides: deck.slides.length,
    items,
    sourceSnapshotHashes: await Promise.all(
      (deck.sourceDocuments ?? []).map(async (d) => ({ id: d.id, sha256: await sha256(d) })),
    ),
    scope:
      "Review all text, study context, figures, attributions and cross-slide redundancy. Notes may contain private material: share deliberately.",
  };
  return { ...content, packHash: await sha256(content) };
}
export function scientificReviewerForm(
  pack: { packHash: string; items: { id: string; contentHash: string }[] },
  id: string,
) {
  return {
    packHash: pack.packHash,
    reviewer: { id, credentials: "", independent: false, conflictDeclaration: "" },
    completedAt: "",
    decisions: pack.items.map((i) => ({
      id: i.id,
      contentHash: i.contentHash,
      verdict: "pending" as const,
      rationale: "",
      sourceUrls: [],
      redundantWith: [],
    })),
  };
}
export async function downloadScientificReviewPack(deck: Deck) {
  const [{ default: JSZip }, { saveFile }] = await Promise.all([
    import("jszip"),
    import("./desktop"),
  ]);
  const pack = await makeScientificReviewPack(deck),
    zip = new JSZip();
  zip.file("pack.json", JSON.stringify(pack, null, 2));
  for (const id of ["reviewer-A", "reviewer-B"])
    zip.file(`${id}.json`, JSON.stringify(scientificReviewerForm(pack, id), null, 2));
  zip.file(
    "REVIEW-INSTRUCTIONS.txt",
    "This is an unreviewed scientific review handoff, not certification.\nThe pack contains private notes, quotations and media links. Share deliberately.\nGive separate forms to two qualified external reviewers; keep their decisions separate until both return.\nReview every title, note, claim, figure, study limitation and redundant concept. Check current original sources, corrections and guidance.\nFor each item choose supported/revise/remove/not-factual; add rationale and sourceUrls. Supported factual claims need HTTPS sources. Identify redundancy with other item IDs in redundantWith.\nFill credentials, independence/conflict declarations and completedAt (ISO date/time). Reviewer identity and qualifications require independent coordinator verification.\nAny change to content requires a new pack and review. Do not edit pack.json.\nReviewers can open this pack in the app Review panel → Complete an external review, fill decisions and export their form. The coordinator loads the original pack and both returned forms in Assess returned reviewer forms. No automatic scientific pass or reviewer authentication is provided.\n",
  );
  return saveFile(
    "microbiology-independent-review.zip",
    await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
    "zip",
  );
}
