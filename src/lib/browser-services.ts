import { generateLocalAiDeck, localCopilot, localAiConfig } from "./local-ai";
import type { Citation, GenerateInput, Deck } from "./types";
import { retrieveModelSources, groundModelDeck } from "./source-grounded-ai";
const unavailable =
  "Local AI is not configured. Set up a local Ollama model, or use Knowledge mode with public research sources.";
export async function generateAiDeck({
  data,
  signal,
  progress,
}: {
  data: GenerateInput;
  progress?: (message: string) => void;
  signal?: AbortSignal;
}) {
  let source: Deck | undefined;
  try {
    if (!localAiConfig()) throw Error(unavailable);
    source = await retrieveModelSources(data, signal, progress);
    progress?.("Drafting from the retrieved passage pack with local AI…");
    const drafted = await generateLocalAiDeck(data, signal, source);
    signal?.throwIfAborted();
    return { ok: true as const, deck: groundModelDeck(drafted, source) };
  } catch (error) {
    signal?.throwIfAborted();
    if (source)
      return {
        ok: true as const,
        deck: {
          ...source,
          contentWarnings: [
            ...(source.contentWarnings || []),
            "Local AI drafting failed; the complete retrieved source draft was retained. No unsupported model content was inserted.",
          ],
        },
      };
    return {
      ok: false as const,
      error: `${error instanceof Error ? error.message : unavailable} Existing work was kept; add attributable sources or choose Knowledge research.`,
      deck: undefined,
    };
  }
}
/** Structured-mode layout proposals are untrusted; callers must run groundedModelFields before copying them. */
export async function generateAiLayout({
  data,
  signal,
}: {
  data: GenerateInput;
  signal?: AbortSignal;
}) {
  try {
    return { ok: true as const, deck: await generateLocalAiDeck(data, signal) };
  } catch (error) {
    signal?.throwIfAborted();
    return { ok: false as const, error: error instanceof Error ? error.message : unavailable };
  }
}
export async function askCopilot(_input: {
  data: { question: string; slideTitle: string; slideBody: string; refine: boolean };
}) {
  try {
    return { ok: true as const, text: await localCopilot(_input.data) };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : unavailable,
      text: "",
    };
  }
}
async function json(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Literature service returned ${response.status}.`);
  return response.json();
}
export async function searchPubmed({ data }: { data: { query: string } }) {
  try {
    const q = data.query.trim().slice(0, 500);
    if (!q) throw new Error("Enter a search term.");
    const base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";
    const found = await json(
      `${base}esearch.fcgi?db=pubmed&retmode=json&retmax=10&term=${encodeURIComponent(q)}`,
    );
    const ids: string[] = found.esearchresult?.idlist ?? [];
    if (!ids.length) return { ok: true as const, citations: [] as Citation[] };
    const result = await json(`${base}esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`);
    const citations: Citation[] = ids
      .filter((id) => result.result?.[id])
      .map((id) => {
        const p = result.result[id];
        return {
          id: `pmid${id}`,
          pmid: id,
          authors: (p.authors ?? []).map((a: { name: string }) => a.name).join(", "),
          title: p.title,
          journal: p.fulljournalname || p.source || "",
          year: (p.pubdate || "").slice(0, 4),
          doi: p.articleids?.find((x: { idtype: string }) => x.idtype === "doi")?.value,
          volume: p.volume,
          pages: p.pages,
        };
      });
    return { ok: true as const, citations };
  } catch (e) {
    return {
      ok: false as const,
      error: `${e instanceof Error ? e.message : "Search unavailable"} Check connectivity or import references.`,
      citations: [] as Citation[],
    };
  }
}
export async function searchOpenAlex({ data }: { data: { query: string } }) {
  try {
    const body = await json(
      `https://api.openalex.org/works?search=${encodeURIComponent(data.query.trim().slice(0, 500))}&per_page=10`,
    );
    const citations: Citation[] = (body.results ?? []).map(
      (p: {
        id: string;
        display_name: string;
        publication_year: number;
        doi?: string;
        authorships?: { author: { display_name: string } }[];
        primary_location?: { source?: { display_name: string } };
      }) => ({
        id: p.id,
        title: p.display_name,
        year: String(p.publication_year),
        authors: (p.authorships ?? []).map((a) => a.author.display_name).join(", "),
        journal: p.primary_location?.source?.display_name || "",
        doi: p.doi?.replace("https://doi.org/", ""),
      }),
    );
    return { ok: true as const, citations };
  } catch {
    return {
      ok: false as const,
      error: "OpenAlex is unavailable. Try PubMed or import an export.",
      citations: [] as Citation[],
    };
  }
}
