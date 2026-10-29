import type { GenerateInput } from "./types";
import { readLocalRecord, writeLocalRecord } from "./durable-storage";
export function researchCheckpointKey(input: GenerateInput) {
  const raw = JSON.stringify(input);
  let hash = 2166136261;
  for (const c of raw) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return `research-checkpoint-v1:${(hash >>> 0).toString(16)}`;
}
export type ResearchCheckpoint = {
  input: GenerateInput;
  round: number;
  work: { query: string; cursor: string }[];
  completedSlides: unknown[];
  papers: unknown[];
  savedAt: number;
};
export function validResearchCheckpoint(
  raw: string | null,
  input: GenerateInput,
): ResearchCheckpoint | null {
  try {
    const v = JSON.parse(raw || "null");
    if (
      !v ||
      JSON.stringify(v.input) !== JSON.stringify(input) ||
      !Number.isInteger(v.round) ||
      v.round < 0 ||
      v.round > 10 ||
      !Array.isArray(v.papers) ||
      v.papers.length > 10000 ||
      !v.papers.every((p: unknown) => p && typeof p === "object" && !Array.isArray(p)) ||
      !Array.isArray(v.completedSlides) ||
      v.completedSlides.length > 50 ||
      !Array.isArray(v.work) ||
      v.work.length > 100 ||
      !v.work.every(
        (w: { query?: unknown; cursor?: unknown }) =>
          typeof w.query === "string" && typeof w.cursor === "string",
      )
    )
      return null;
    return v;
  } catch {
    return null;
  }
}
export async function readResearchCheckpoint(input: GenerateInput) {
  return validResearchCheckpoint(await readLocalRecord(researchCheckpointKey(input)), input);
}
export async function saveResearchCheckpoint(checkpoint: ResearchCheckpoint) {
  // Pure Node/SSR contract tests have no device database. Browsers never skip persistence errors.
  if (typeof window === "undefined" && typeof indexedDB === "undefined") return;
  await writeLocalRecord(researchCheckpointKey(checkpoint.input), JSON.stringify(checkpoint));
}
