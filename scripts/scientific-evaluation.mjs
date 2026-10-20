import { createHash } from "node:crypto";
import { reviewFields } from "../src/lib/scientific-review-pack.ts";
export const digest = (value) =>
  createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value))
    .digest("hex");
export function wilson(successes, total) {
  if (!total) return null;
  const z = 1.95996398454,
    p = successes / total,
    d = 1 + (z * z) / total;
  const centre = (p + (z * z) / (2 * total)) / d;
  const margin = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / d;
  return [Math.max(0, centre - margin), Math.min(1, centre + margin)];
}
export function metrics(rows, threshold) {
  if (!Number.isFinite(threshold) || threshold < 0.7 || threshold > 1)
    throw Error("Invalid threshold");
  let tp = 0,
    fp = 0,
    fn = 0,
    tn = 0;
  for (const r of rows) {
    if (!Number.isFinite(r.score) || r.score < -1.000001 || r.score > 1.000001)
      throw Error("Invalid raw cosine");
    if (!["repetition", "distinct", "contradiction"].includes(r.proposedLabel))
      throw Error("Unknown label");
    const positive = r.proposedLabel === "repetition",
      detected = r.score >= threshold;
    if (positive && detected) tp++;
    else if (detected) fp++;
    else if (positive) fn++;
    else tn++;
  }
  const precision = tp + fp ? tp / (tp + fp) : null;
  const recall = tp + fn ? tp / (tp + fn) : null;
  return {
    tp,
    fp,
    fn,
    tn,
    precision,
    recall,
    f1: 2 * tp + fp + fn ? (2 * tp) / (2 * tp + fp + fn) : null,
    precision95: wilson(tp, tp + fp),
    recall95: wilson(tp, tp + fn),
    contradictionFalsePositiveRate: rows.some((r) => r.proposedLabel === "contradiction")
      ? rows.filter((r) => r.proposedLabel === "contradiction" && r.score >= threshold).length /
        rows.filter((r) => r.proposedLabel === "contradiction").length
      : null,
  };
}
export function splitCases(cases) {
  if (new Set(cases.map((c) => c.id)).size !== cases.length) throw Error("Duplicate case IDs");
  const domains = [...new Set(cases.map((c) => c.domain))].sort();
  if (domains.length < 3) throw Error("At least three concept domains required");
  // Whole domains stay together: repeated anchor sentences cannot leak across partitions.
  const evaluationDomains = domains.filter((_, i) => i % 3 === 2);
  const split = cases.map((c) => ({
    ...c,
    partition: evaluationDomains.includes(c.domain) ? "evaluation" : "calibration",
  }));
  const seen = new Map();
  for (const c of split)
    for (const text of [c.a, c.b]) {
      const key = text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
      if (seen.has(key) && seen.get(key) !== c.partition)
        throw Error("Statement leakage between partitions");
      seen.set(key, c.partition);
    }
  return split;
}
export function evaluateScores(rows) {
  const calibration = rows.filter((r) => r.partition === "calibration"),
    evaluation = rows.filter((r) => r.partition === "evaluation");
  for (const group of [calibration, evaluation])
    if (
      !group.some((r) => r.proposedLabel === "repetition") ||
      !group.some((r) => r.proposedLabel !== "repetition")
    )
      throw Error("Each partition needs positives and negatives");
  const curve = Array.from({ length: 31 }, (_, i) => {
    const threshold = Number((0.7 + i * 0.01).toFixed(2));
    return { threshold, ...metrics(calibration, threshold) };
  });
  const best = [...curve].sort(
    (a, b) =>
      (b.f1 ?? -1) - (a.f1 ?? -1) ||
      (b.precision ?? -1) - (a.precision ?? -1) ||
      b.threshold - a.threshold,
  )[0];
  return {
    selectedThreshold: best.threshold,
    calibration: best,
    evaluation: metrics(evaluation, best.threshold),
    curve,
    limitations:
      "Developer labels and development evaluation only. Wilson intervals assume independent pairs; shared anchors/domains violate this assumption, so intervals are descriptive. This is binary repetition-candidate scoring, not contradiction detection or factual accuracy. No production threshold is changed automatically.",
  };
}
export function reviewItems(deck) {
  const items = reviewFields(deck);
  return items.map((item, i) => ({
    id: `item-${String(i + 1).padStart(4, "0")}`,
    ...item,
    contentHash: digest(item),
  }));
}
export function assessReviews(pack, reviews, now = Date.now()) {
  const errors = [],
    accepted = [];
  const people = new Set();
  for (const r of reviews) {
    if (!r.reviewer?.id || people.has(r.reviewer.id)) {
      errors.push("Missing or duplicate reviewer identity");
      continue;
    }
    people.add(r.reviewer.id);
    if (r.packHash !== pack.packHash) errors.push(`Stale review: ${r.reviewer.id}`);
    if (
      r.reviewer.independent !== true ||
      !r.reviewer.credentials?.trim() ||
      !r.reviewer.conflictDeclaration?.trim()
    )
      errors.push(`Reviewer attestation incomplete: ${r.reviewer.id}`);
    const date = Date.parse(r.completedAt);
    if (!Number.isFinite(date) || date > now || date < Date.parse(pack.createdAt))
      errors.push(`Invalid review date: ${r.reviewer.id}`);
    if (!Array.isArray(r.decisions)) {
      errors.push("Missing decisions");
      continue;
    }
    if (
      new Set(r.decisions.map((d) => d.id)).size !== r.decisions.length ||
      r.decisions.length !== pack.items.length
    )
      errors.push("Duplicate or incomplete decisions");
    for (const item of pack.items) {
      const d = r.decisions.find((d) => d.id === item.id);
      if (
        !d ||
        d.contentHash !== item.contentHash ||
        !["supported", "revise", "remove", "not-factual"].includes(d.verdict) ||
        !d.rationale?.trim() ||
        !Array.isArray(d.sourceUrls)
      ) {
        errors.push(`Incomplete decision ${item.id}`);
        continue;
      }
      if (
        !Array.isArray(d.redundantWith) ||
        d.redundantWith.some((id) => id === item.id || !pack.items.some((i) => i.id === id))
      )
        errors.push(`Invalid redundancy decisions ${item.id}`);
      if (
        d.verdict === "supported" &&
        !d.sourceUrls.some((url) => {
          try {
            return new URL(url).protocol === "https:";
          } catch {
            return false;
          }
        })
      )
        errors.push(`Missing scientific source ${item.id}`);
    }
    accepted.push(r);
  }
  if (reviews.length !== 2) errors.push("Exactly two separate reviewer attestations required");
  const disagreements = pack.items
    .filter(
      (item) =>
        new Set(accepted.map((r) => r.decisions.find((d) => d.id === item.id)?.verdict)).size > 1,
    )
    .map((i) => i.id);
  const corrections = pack.items
    .filter((item) =>
      accepted.some(
        (r) =>
          ["revise", "remove"].includes(r.decisions.find((d) => d.id === item.id)?.verdict) ||
          r.decisions.find((d) => d.id === item.id)?.redundantWith?.length,
      ),
    )
    .map((i) => i.id);
  return {
    status: errors.length
      ? "incomplete"
      : disagreements.length || corrections.length
        ? "corrections-or-adjudication-required"
        : "two-reviewer-attestations-complete",
    errors: [...new Set(errors)],
    disagreements,
    corrections,
    independentlyVerified: false,
    scientificCertification: false,
    limitations:
      "Identity, qualifications and independence are self-attested, not authenticated by this tool. Coordinator must verify reviewers and adjudicate disagreements. Edits require a new pack and review. This report never changes app classroom readiness.",
  };
}
