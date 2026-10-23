import { XMLParser, XMLValidator } from "fast-xml-parser";

type Node = Record<string, unknown>;
function children(nodes: Node[], tag: string): Node[][] {
  return nodes.flatMap((node) =>
    Object.entries(node).flatMap(([key, value]) =>
      Array.isArray(value) ? (key === tag ? [value as Node[]] : children(value, tag)) : [],
    ),
  );
}
function direct(nodes: Node[], tag: string): Node[][] {
  return nodes.flatMap((node) => (Array.isArray(node[tag]) ? [node[tag] as Node[]] : []));
}
function content(nodes: Node[]): string {
  return nodes
    .map((node) =>
      Object.entries(node)
        .filter(([key]) => key !== ":@")
        .map(([key, value]) =>
          key === "#text" ? String(value) : Array.isArray(value) ? content(value) : "",
        )
        .join(""),
    )
    .join("");
}
export function parsePubmedAbstracts(xml: string, requestedIds: string[]) {
  if (xml.length > 2_000_000 || /<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true)
    throw Error("Invalid PubMed abstract response.");
  const tree = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    processEntities: true,
    htmlEntities: true,
    trimValues: false,
  }).parse(xml) as Node[];
  return children(tree, "PubmedArticle").flatMap((article) => {
    const value = (tag: string) => content(children(article, tag)[0] || []).trim();
    const pmid = value("PMID");
    if (!requestedIds.includes(pmid)) throw Error("PubMed response identity mismatch.");
    // Any linked correction/notice needs separate review before excerpt generation.
    if (children(article, "CommentsCorrections").length) return [];
    const types = children(article, "PublicationType").map(content);
    if (types.some((t) => /retract|preprint|expression of concern|published erratum/i.test(t)))
      return [];
    const paragraphs = children(article, "AbstractText")
      .map(content)
      .map((p) => p.trim())
      .filter(Boolean);
    const title = value("ArticleTitle");
    if (!title || !paragraphs.length) return [];
    // Reference-list identifiers belong to cited papers, never to this record.
    const pubdata = direct(article, "PubmedData")[0] || [];
    const ids = direct(direct(pubdata, "ArticleIdList")[0] || [], "ArticleId");
    const doi = ids.find((nodes) =>
      nodes.some((n) => /^10\.\d{4,9}\//.test(String(n["#text"] || ""))),
    );
    return [
      {
        id: pmid,
        pmid,
        source: "MED",
        title,
        abstractText: paragraphs.join("\n\n"),
        authorString: children(article, "Author")
          .map((nodes) => {
            const field = (tag: string) => content(children(nodes, tag)[0] || []).trim();
            return (
              field("CollectiveName") ||
              [field("LastName"), field("Initials")].filter(Boolean).join(" ")
            );
          })
          .filter(Boolean)
          .join(", "),
        pubYear: value("Year") || value("MedlineDate").match(/\d{4}/)?.[0] || "",
        doi: doi ? content(doi).trim() : undefined,
        journalInfo: { journal: { title: value("Title") } },
        pubTypeList: { pubType: types },
      },
    ];
  });
}

/** Independent abstract provider; never replaces missing text with metadata or generated facts. */
export async function fetchPubmedAbstracts(query: string, signal: AbortSignal) {
  const base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";
  const get = async (url: string) => {
    const response = await fetch(url, {
      credentials: "omit",
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    });
    if (!response.ok) throw Error(`PubMed returned ${response.status}`);
    return response;
  };
  const search = await get(
    `${base}esearch.fcgi?db=pubmed&retmode=json&retmax=100&sort=relevance&term=${encodeURIComponent(query)}`,
  );
  const ids: unknown = (await search.json()).esearchresult?.idlist;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !/^\d+$/.test(id)))
    throw Error("Invalid PubMed search response.");
  if (!ids.length) return [];
  const selected = ids.slice(0, 100) as string[];
  // PubMed records can contain extensive reference lists. Bound each XML batch
  // independently so normal 100-result responses do not exceed the parser limit.
  const records: ReturnType<typeof parsePubmedAbstracts> = [];
  for (let i = 0; i < selected.length; i += 25) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    signal.throwIfAborted();
    const batch = selected.slice(i, i + 25);
    const response = await get(`${base}efetch.fcgi?db=pubmed&retmode=xml&id=${batch.join(",")}`);
    records.push(...parsePubmedAbstracts(await response.text(), batch));
  }
  return records;
}
