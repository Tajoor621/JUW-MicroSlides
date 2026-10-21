import { localAiConfig, validateLocalAiUrl } from "./local-ai";
import { slideStatements } from "./deck-integrity";
import type { Deck } from "./types";
export type SemanticFinding = {
  first: number;
  second: number;
  a: string;
  b: string;
  similarity: number;
  kind: "related-statements" | "changed-wording-review";
};
export function cosine(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length || [...a, ...b].some((n) => !Number.isFinite(n)))
    throw Error("Invalid embedding vectors.");
  const norm = Math.hypot(...a) * Math.hypot(...b);
  if (!norm) throw Error("Zero embedding vector.");
  return a.reduce((sum, x, i) => sum + x * b[i], 0) / norm;
}
export function compareEmbeddings(
  rows: { text: string; index: number }[],
  embeddings: number[][],
  threshold = 0.9,
): SemanticFinding[] {
  if (
    rows.length !== embeddings.length ||
    !Number.isFinite(threshold) ||
    threshold < 0.7 ||
    threshold > 1
  )
    throw Error("Invalid semantic screening input.");
  embeddings.forEach((e) => cosine(e, e));
  const findings: SemanticFinding[] = [];
  for (let i = 0; i < rows.length; i++)
    for (let j = i + 1; j < rows.length; j++) {
      const score = cosine(embeddings[i], embeddings[j]);
      if (score < threshold) continue;
      const a = rows[i],
        b = rows[j];
      const altered =
        /\b(not|never|no|without|cannot|unable)\b/i.test(a.text) !==
          /\b(not|never|no|without|cannot|unable)\b/i.test(b.text) ||
        JSON.stringify(a.text.match(/\d+(?:\.\d+)?/g)) !==
          JSON.stringify(b.text.match(/\d+(?:\.\d+)?/g));
      findings.push({
        first: a.index,
        second: b.index,
        a: a.text,
        b: b.text,
        similarity: score,
        kind: altered ? "changed-wording-review" : "related-statements",
      });
    }
  return findings.sort((a, b) => b.similarity - a.similarity);
}
export async function semanticReview(deck: Deck, signal?: AbortSignal) {
  const config = localAiConfig();
  if (!config?.embeddingModel)
    throw Error("Choose an installed embedding model in Settings. No semantic check has run.");
  const rows = deck.slides.flatMap((s, index) =>
    slideStatements(s).map((text) => ({ text, index })),
  );
  if (rows.length > 400)
    throw Error(
      "Semantic screening supports up to 400 teaching statements per deck; reduce overcrowded content. Nothing was silently omitted.",
    );
  if (!rows.length)
    throw Error("No teaching statements to screen; no semantic verdict is available.");
  const base = validateLocalAiUrl(config.url);
  const modelDigest = async () => {
    const response = await localAiFetch(`${base}/api/tags`, {
      credentials: "omit",
      signal: AbortSignal.any([AbortSignal.timeout(10000), ...(signal ? [signal] : [])]),
    });
    if (!response.ok) throw Error("Cannot establish the installed embedding model identity.");
    const data = await response.json();
    const installed = Array.isArray(data.models)
      ? data.models.find(
          (m: { name?: string; model?: string }) =>
            m.name === config.embeddingModel ||
            m.model === config.embeddingModel ||
            m.name === `${config.embeddingModel}:latest`,
        )
      : undefined;
    if (
      !installed ||
      typeof installed.digest !== "string" ||
      !/^[a-f0-9]{64}$/i.test(installed.digest)
    )
      throw Error(
        "Installed embedding model digest is unavailable; no reproducible semantic verdict is available.",
      );
    return installed.digest as string;
  };
  const digest = await modelDigest();
  const embeddings: number[][] = [];
  const start = performance.now();
  let model = "";
  for (let offset = 0; offset < rows.length; offset += 24) {
    const batch = rows.slice(offset, offset + 24);
    const r = await localAiFetch(`${validateLocalAiUrl(config.url)}/api/embed`, {
      method: "POST",
      credentials: "omit",
      signal: AbortSignal.any([AbortSignal.timeout(45000), ...(signal ? [signal] : [])]),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.embeddingModel,
        input: batch.map((r) => r.text),
        truncate: false,
      }),
    });
    if (!r.ok)
      throw Error(
        `Embedding service returned ${r.status}; no complete semantic verdict is available.`,
      );
    const data = await r.json();
    if (
      !Array.isArray(data.embeddings) ||
      data.embeddings.length !== batch.length ||
      data.embeddings.some((e: unknown) => !Array.isArray(e) || e.length > 8192)
    )
      throw Error("Incomplete embedding response.");
    if (typeof data.model !== "string" || !data.model.trim())
      throw Error("Embedding response did not identify its model.");
    if (model && data.model !== model) throw Error("Embedding model changed between batches.");
    model = data.model;
    embeddings.push(...data.embeddings);
  }
  if ((await modelDigest()) !== digest)
    throw Error("Installed model changed during screening; rerun the complete check.");
  return {
    modelDigest: digest,
    independentlyCalibrated: false,
    findings: compareEmbeddings(rows, embeddings),
    model,
    threshold: 0.9,
    statements: rows.length,
    elapsedMs: Math.round(performance.now() - start),
    checkedAt: Date.now(),
    limitations:
      "Embedding similarity identifies related statements, not factual truth, repetition or contradiction. Changed wording flags only numbers or negation; other scientific differences can be missed. The threshold is uncalibrated for this model. Review both passages and their context. No content is removed automatically.",
  };
}
import { localAiFetch } from "./local-ai-transport";
