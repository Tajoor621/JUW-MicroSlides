import Papa from "papaparse";
import { citationSchema } from "./backup";
import { Cite } from "@citation-js/core";
import "@citation-js/plugin-bibtex";
import type { Citation } from "./types";
import { uid } from "./utils";

function asAuthors(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const person = item as {
            name?: string;
            literal?: string;
            family?: string;
            given?: string;
          };
          return (
            person.name ||
            person.literal ||
            [person.family, person.given].filter(Boolean).join(", ")
          );
        }
        return "";
      })
      .filter(Boolean)
      .slice(0, 4)
      .join(", ");
  }
  if (typeof value === "string") return value;
  return "Unknown";
}

function fromRecord(raw: Record<string, unknown>): Citation | null {
  const title = String(raw.title ?? raw.Title ?? raw.display_name ?? raw.name ?? "").trim();
  if (!title) return null;
  const issued = raw.issued as { "date-parts"?: number[][] } | undefined;
  const year = String(
    raw.year ??
      raw.Year ??
      raw.publication_year ??
      issued?.["date-parts"]?.[0]?.[0] ??
      raw.date ??
      "",
  ).slice(0, 4);
  const journal = String(
    raw["container-title"] ??
      raw.journal ??
      raw.Journal ??
      raw.venue ??
      raw.source ??
      raw.publication ??
      "",
  ).trim();
  const doiRaw = String(raw.doi ?? raw.DOI ?? "").replace(/^https?:\/\/doi.org\//i, "");
  const authors = asAuthors(raw.authors ?? raw.Authors ?? raw.author ?? raw.Author);
  return citationSchema.parse({
    id: uid("ev"),
    authors: authors || "Unknown",
    title: title.replace(/\.$/, ""),
    journal: journal || "Journal",
    year: /\d{4}/.test(year) ? year : "n.d.",
    doi: doiRaw || undefined,
    pmid: raw.pmid ? String(raw.pmid) : undefined,
    volume: raw.volume ? String(raw.volume) : undefined,
    pages: raw.page || raw.pages ? String(raw.page || raw.pages) : undefined,
    ...(typeof raw.type === "string"
      ? {
          cslJson: JSON.stringify(raw),
          cslAuthors: Array.isArray(raw.author)
            ? (raw.author as Citation["cslAuthors"])
            : undefined,
          url: typeof raw.URL === "string" ? raw.URL : undefined,
          publisher: typeof raw.publisher === "string" ? raw.publisher : undefined,
        }
      : {}),
  });
}

function parseJson(raw: string): Citation[] {
  const json = JSON.parse(raw) as unknown;
  const list: unknown[] = Array.isArray(json)
    ? json
    : json && typeof json === "object"
      ? "title" in json
        ? [json]
        : (((json as { papers?: unknown; results?: unknown; items?: unknown; data?: unknown })
            .papers ??
            (json as { results?: unknown }).results ??
            (json as { items?: unknown }).items ??
            (json as { data?: unknown }).data ??
            []) as unknown[])
      : [];
  if (!Array.isArray(list)) return [];
  return list
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map(fromRecord)
    .filter((c): c is Citation => Boolean(c));
}

function parseCsv(raw: string): Citation[] {
  const result = Papa.parse<Record<string, string>>(raw, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  if (result.errors.length) throw new Error(`CSV import: ${result.errors[0].message}`);
  return result.data.map((row) => fromRecord(row)).filter((c): c is Citation => Boolean(c));
}

function parseBibtex(raw: string): Citation[] {
  const cite = new Cite(raw);
  return cite.data
    .map((record) => {
      const names = record.author ?? [];
      const made = fromRecord({
        title: record.title,
        authors: names
          .map((name) => name.literal || [name.family, name.given].filter(Boolean).join(", "))
          .join("; "),
        year: record.issued?.["date-parts"]?.[0]?.[0],
        journal: record["container-title"],
        doi: record.DOI,
      });
      return made
        ? citationSchema.parse({ ...made, cslAuthors: names, cslJson: JSON.stringify(record) })
        : null;
    })
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
}

/** Parse pasted Elicit / Zotero / OpenAlex exports (JSON, CSV, or BibTeX). */
export function parseEvidencePaste(raw: string): Citation[] {
  if (raw.length > 2000000) throw new Error("Reference import exceeds 2 MB.");
  const text = raw.trim();
  if (!text) return [];
  if (text.startsWith("{") || text.startsWith("[")) {
    const jsonHits = parseJson(text);
    if (!jsonHits.length) throw new Error("No titled reference records found in JSON.");
    return jsonHits;
  }
  if (/@\w+\s*\{/.test(text)) {
    const bib = parseBibtex(text);
    if (bib.length) return bib;
  }
  return parseCsv(text);
}
