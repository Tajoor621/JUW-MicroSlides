/** Reject gaps/overlapping positions rather than joining fragments across missing words. */
export function reconstructOpenAlexAbstract(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const words: string[] = [];
  for (const [word, positions] of Object.entries(raw)) {
    if (!word || !Array.isArray(positions)) return null;
    for (const position of positions) {
      if (
        !Number.isInteger(position) ||
        position < 0 ||
        position >= 5000 ||
        words[position] !== undefined
      )
        return null;
      words[position] = word;
    }
  }
  if (!words.length || Array.from(words).some((word) => !word)) return null;
  return words.join(" ");
}
/** OpenAlex discovery only; reconstruct provider abstract positions without inventing text. */
export async function fetchOpenAlexPassages(topic: string, signal: AbortSignal) {
  const response = await fetch(
    `https://api.openalex.org/works?search=${encodeURIComponent(topic.slice(0, 500))}&per_page=25`,
    { credentials: "omit", signal: AbortSignal.any([signal, AbortSignal.timeout(25000)]) },
  );
  if (!response.ok)
    throw Error(`OpenAlex returned ${response.status}; sources were not fabricated.`);
  const json = await response.json();
  return (Array.isArray(json.results) ? json.results : []).flatMap(
    (raw: Record<string, unknown>) => {
      const inverted = raw.abstract_inverted_index;
      if (!inverted || typeof inverted !== "object" || typeof raw.title !== "string") return [];
      const abstractText = reconstructOpenAlexAbstract(inverted);
      if (!abstractText) return [];
      const doi =
        typeof raw.doi === "string" ? raw.doi.replace(/^https?:\/\/doi.org\//i, "") : undefined;
      if (!doi) return [];
      return [
        {
          id: typeof raw.id === "string" ? raw.id : doi,
          source: "OPENALEX",
          title: raw.title,
          abstractText,
          doi,
          pubYear: String(raw.publication_year || ""),
          authorString: "Authors: see original record",
          journalInfo: { journal: { title: "See original publication" } },
        },
      ];
    },
  );
}
