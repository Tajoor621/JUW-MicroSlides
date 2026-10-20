import { XMLParser, XMLValidator } from "fast-xml-parser";
import { z } from "zod";
export const sourceDocumentSchema = z.object({
  id: z.string().max(200),
  title: z.string().min(1).max(1000),
  url: z
    .string()
    .url()
    .max(2000)
    .refine((url) => {
      try {
        authoritativePublisher(url);
        return true;
      } catch {
        return false;
      }
    }, "Use an allowed authoritative HTTPS publisher URL"),
  publisher: z.string().max(200),
  access: z.enum(["full-text", "textbook", "guideline"]),
  text: z.string().min(80).max(120000),
  locator: z.string().min(1).max(500),
  license: z.string().min(1).max(1000),
  retrievedAt: z.number().finite(),
  publishedDate: z.string().max(100),
  jurisdiction: z.string().max(200),
  currencyConfirmedAt: z.number().finite().optional(),
  acquisition: z.enum(["provider-xml", "publisher-html", "lecturer-import"]),
});
export type SourceDocument = z.infer<typeof sourceDocumentSchema>;
export const SOURCE_PORTALS = [
  { title: "OpenStax Microbiology", url: "https://openstax.org/details/books/microbiology" },
  { title: "CDC clinical guidance", url: "https://www.cdc.gov/clinical-guidance/" },
  { title: "WHO publications", url: "https://www.who.int/publications" },
  { title: "NCBI Bookshelf", url: "https://www.ncbi.nlm.nih.gov/books/" },
  { title: "Europe PMC open literature", url: "https://europepmc.org/" },
];
export function authoritativePublisher(raw: string) {
  const u = new URL(raw);
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443"))
    throw Error("Use the publisher's public HTTPS address.");
  const providers: Record<string, string> = {
    "cdc.gov": "CDC",
    "who.int": "WHO",
    "openstax.org": "OpenStax",
    "ncbi.nlm.nih.gov": "NCBI",
    "europepmc.org": "Europe PMC",
    "ebi.ac.uk": "EMBL-EBI",
  };
  const host = Object.keys(providers).find((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  if (!host)
    throw Error(
      "Use a CDC, WHO, OpenStax, NCBI or Europe PMC source. Other references remain available through citation import.",
    );
  return providers[host];
}
export function parseJats(xml: string) {
  if (xml.length > 2000000 || /<!ENTITY/i.test(xml))
    throw Error("Unsafe or oversized scientific XML.");
  if (XMLValidator.validate(xml) !== true) throw Error("Malformed scientific XML.");
  const parser = new XMLParser({
    ignoreAttributes: false,
    processEntities: true,
    htmlEntities: true,
    preserveOrder: true,
    trimValues: false,
  });
  const tree = parser.parse(xml);
  const flatten = (nodes: Record<string, unknown>[]): string =>
    nodes
      .map((n) =>
        Object.entries(n)
          .filter(([k]) => k !== ":@")
          .map(([k, v]) => (k === "#text" ? String(v) : Array.isArray(v) ? flatten(v) : ""))
          .join(""),
      )
      .join("");
  let body: Record<string, unknown>[] | undefined;
  const find = (nodes: Record<string, unknown>[]) => {
    for (const n of nodes)
      for (const [k, v] of Object.entries(n)) {
        if (k === "body" && Array.isArray(v)) body = v;
        else if (Array.isArray(v)) find(v);
      }
  };
  find(tree);
  if (!body) throw Error("No article body supplied; abstract access is not full-text access.");
  const paragraphs: string[] = [];
  const collect = (nodes: Record<string, unknown>[]) => {
    for (const n of nodes)
      for (const [k, v] of Object.entries(n)) {
        if (["ref-list", "fig", "table-wrap", "supplementary-material"].includes(k)) continue;
        if ((k === "p" || k === "title") && Array.isArray(v))
          paragraphs.push(flatten(v).replace(/\s+/g, " ").trim());
        else if (Array.isArray(v)) collect(v);
      }
  };
  collect(body);
  return paragraphs.filter(Boolean).join("\n\n").slice(0, 120000);
}
async function boundedText(response: Response) {
  if (Number(response.headers.get("content-length") || 0) > 2000000)
    throw Error("Source exceeds 2 MB.");
  if (!response.body) throw Error("Empty publisher response.");
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let size = 0,
    text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2000000) throw Error("Source exceeds 2 MB.");
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    await reader.cancel();
  }
}
export async function fetchOpenArticle(pmcid: string, signal?: AbortSignal): Promise<string> {
  if (!/^PMC\d+$/.test(pmcid)) throw Error("Invalid PMCID.");
  const r = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/${pmcid}/fullTextXML`, {
    credentials: "omit",
    signal: AbortSignal.any([AbortSignal.timeout(9000), ...(signal ? [signal] : [])]),
  });
  if (!r.ok) throw Error(`Full text unavailable (${r.status}); retain abstract-only status.`);
  const declared = Number(r.headers.get("content-length") || 0);
  if (declared > 2000000) throw Error("Scientific XML exceeds 2 MB.");
  return parseJats(await boundedText(r));
}
export async function fetchPublisherPage(url: string): Promise<string> {
  authoritativePublisher(url);
  const r = await fetch(url, {
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok)
    throw Error(
      "Publisher page unavailable. Paste a permitted passage and its exact locator instead.",
    );
  if (!/text\/html/.test(r.headers.get("content-type") || ""))
    throw Error("Use an HTML article page, or paste an attributed passage from the document.");
  const raw = await boundedText(r);
  if (raw.length > 2000000) throw Error("Page exceeds 2 MB.");
  const doc = new DOMParser().parseFromString(raw, "text/html");
  doc.querySelectorAll("script,style,nav,header,footer,aside,form").forEach((n) => n.remove());
  const content = doc.querySelector("article") || doc.querySelector("main");
  if (!content) throw Error("Could not isolate the article. Paste the relevant passage instead.");
  return (content.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120000);
}
export function guidanceNeedsReview(doc: SourceDocument, now = Date.now()) {
  return (
    doc.access === "guideline" &&
    (!doc.publishedDate ||
      !doc.jurisdiction ||
      !doc.currencyConfirmedAt ||
      doc.currencyConfirmedAt > now ||
      now - doc.currencyConfirmedAt > 30 * 86400000)
  );
}
