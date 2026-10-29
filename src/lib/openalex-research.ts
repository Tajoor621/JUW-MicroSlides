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
      const words: string[] = [];
      for (const [word, positions] of Object.entries(inverted))
        if (Array.isArray(positions))
          for (const p of positions) if (Number.isInteger(p) && p >= 0 && p < 5000) words[p] = word;
      if (!words.length || words.some((w) => !w)) return [];
      const doi =
        typeof raw.doi === "string" ? raw.doi.replace(/^https?:\/\/doi.org\//, "") : undefined;
      if (!doi) return [];
      return [
        {
          id: typeof raw.id === "string" ? raw.id : doi,
          source: "OPENALEX",
          title: raw.title,
          abstractText: words.join(" "),
          doi,
          pubYear: String(raw.publication_year || ""),
          authorString: "Authors: see original record",
          journalInfo: { journal: { title: "See original publication" } },
        },
      ];
    },
  );
}
