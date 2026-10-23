import { XMLParser, XMLValidator } from "fast-xml-parser";
import { z } from "zod";
import { readLocalRecord, writeLocalRecord } from "./durable-storage";
import { sourceDocumentSchema } from "./source-documents";
const cachedSchema = z.object({
  nodes: z
    .array(z.object({ label: z.string().max(3000), parent: z.number().int().min(-1).max(29) }))
    .min(1)
    .max(30),
  source: sourceDocumentSchema,
});
export function parseTaxonomyXml(xml: string, expectedId: string) {
  if (xml.length > 2_000_000 || /<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true)
    throw Error("Invalid taxonomy response.");
  const data = new XMLParser({ ignoreAttributes: false, processEntities: false }).parse(xml);
  const taxon = data.TaxaSet?.Taxon;
  if (!taxon || Array.isArray(taxon) || String(taxon.TaxId) !== expectedId)
    throw Error("Taxonomy response identity mismatch.");
  const lineage = taxon.LineageEx?.Taxon || [];
  const rows = [...(Array.isArray(lineage) ? lineage : [lineage]), taxon];
  const nodes = rows
    .filter((n) => typeof n.ScientificName === "string" && !["no rank", "clade"].includes(n.Rank))
    .map((n, i) => ({ label: `${n.Rank}: ${n.ScientificName}`, parent: i - 1 }));
  if (!nodes.length || nodes.length > 30)
    throw Error("Taxonomy lineage is empty or exceeds the supported tree size.");
  return { nodes, name: String(taxon.ScientificName) };
}
export async function lookupTaxonomy(topic: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const key = `v7-taxonomy:${topic.trim().toLowerCase()}`;
  let cached: z.infer<typeof cachedSchema> | undefined;
  try {
    cached = cachedSchema.parse(JSON.parse((await readLocalRecord(key)) || "null"));
  } catch {
    /* No valid cached lookup. */
  }
  if (!navigator.onLine) return cached;
  try {
    const base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";
    const found = await fetch(
      `${base}esearch.fcgi?db=taxonomy&retmode=json&retmax=2&term=${encodeURIComponent(`${topic.trim()}[Scientific Name]`)}`,
      {
        credentials: "omit",
        signal: AbortSignal.any([AbortSignal.timeout(12000), ...(signal ? [signal] : [])]),
      },
    );
    if (!found.ok) throw Error();
    const ids = (await found.json()).esearchresult?.idlist;
    if (!Array.isArray(ids) || ids.length !== 1 || !/^\d+$/.test(ids[0])) return cached;
    const url = `${base}efetch.fcgi?db=taxonomy&id=${ids[0]}&retmode=xml`;
    const response = await fetch(url, {
      credentials: "omit",
      signal: AbortSignal.any([AbortSignal.timeout(12000), ...(signal ? [signal] : [])]),
    });
    if (!response.ok) throw Error();
    const parsed = parseTaxonomyXml(await response.text(), ids[0]);
    const source = sourceDocumentSchema.parse({
      id: `ncbi-taxonomy-${ids[0]}`,
      title: `NCBI Taxonomy: ${parsed.name}`,
      url,
      publisher: "NCBI Taxonomy",
      access: "full-text",
      text: `NCBI Taxonomy lookup for ${parsed.name}, TaxID ${ids[0]}. Database lineage as retrieved; assess nomenclatural status and genome-based taxonomy against current primary sources.\n${parsed.nodes.map((n) => n.label).join("\n")}`,
      locator: `TaxID ${ids[0]}, LineageEx and taxon record`,
      license: "NCBI database record; inspect reuse terms and linked primary nomenclatural sources",
      retrievedAt: Date.now(),
      publishedDate: "Database record at retrieval",
      jurisdiction: "",
      acquisition: "provider-xml",
    });
    const result = cachedSchema.parse({ nodes: parsed.nodes, source });
    try {
      await writeLocalRecord(key, JSON.stringify(result));
    } catch {
      /* The lookup remains available for this deck. */
    }
    return result;
  } catch {
    signal?.throwIfAborted();
    return cached;
  }
}
