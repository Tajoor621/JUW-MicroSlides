import type { Citation } from "./types";
import { uid } from "./utils";

function asAuthors(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "name" in item) return String((item as { name: unknown }).name);
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
  const year = String(raw.year ?? raw.Year ?? raw.publication_year ?? raw.date ?? "").slice(0, 4);
  const journal = String(
    raw.journal ?? raw.Journal ?? raw.venue ?? raw.source ?? raw.publication ?? "",
  ).trim();
  const doiRaw = String(raw.doi ?? raw.DOI ?? "").replace(/^https?:\/\/doi.org\//i, "");
  const authors = asAuthors(raw.authors ?? raw.Authors ?? raw.author ?? raw.Author);
  return {
    id: uid("ev"),
    authors: authors || "Unknown",
    title: title.replace(/\.$/, ""),
    journal: journal || "Journal",
    year: /\d{4}/.test(year) ? year : "n.d.",
    doi: doiRaw || undefined,
    pmid: raw.pmid ? String(raw.pmid) : undefined,
  };
}

function parseJson(raw: string): Citation[] {
  const json = JSON.parse(raw) as unknown;
  const list: unknown[] = Array.isArray(json)
    ? json
    : json && typeof json === "object"
      ? ((json as { papers?: unknown; results?: unknown; items?: unknown; data?: unknown }).papers ??
        (json as { results?: unknown }).results ??
        (json as { items?: unknown }).items ??
        (json as { data?: unknown }).data ??
        []) as unknown[]
      : [];
  if (!Array.isArray(list)) return [];
  return list
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map(fromRecord)
    .filter((c): c is Citation => Boolean(c));
}

function parseCsv(raw: string): Citation[] {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const split = (line: string) => {
    const cells: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        quoted = !quoted;
        continue;
      }
      if (ch === "," && !quoted) {
        cells.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };
  const header = split(lines[0]).map((h) => h.toLowerCase());
  const col = (names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
  const iTitle = col(["title", "paper"]);
  const iAuthors = col(["author"]);
  const iYear = col(["year", "date"]);
  const iJournal = col(["journal", "venue", "source", "publication"]);
  const iDoi = col(["doi"]);
  if (iTitle < 0) return [];
  const out: Citation[] = [];
  for (const line of lines.slice(1)) {
    const cells = split(line);
    const rec: Record<string, unknown> = {
      title: cells[iTitle],
      authors: iAuthors >= 0 ? cells[iAuthors] : "Unknown",
      year: iYear >= 0 ? cells[iYear] : "",
      journal: iJournal >= 0 ? cells[iJournal] : "",
      doi: iDoi >= 0 ? cells[iDoi] : "",
    };
    const c = fromRecord(rec);
    if (c) out.push(c);
  }
  return out;
}

function parseBibtex(raw: string): Citation[] {
  const chunks = raw.split(/@\w+\s*\{/);
  const out: Citation[] = [];
  for (const chunk of chunks.slice(1)) {
    const field = (name: string) => {
      const re = new RegExp(`${name}\\s*=\\s*[{"]([^}"]+)[}"]`, "i");
      return re.exec(chunk)?.[1]?.trim() ?? "";
    };
    const rec: Record<string, unknown> = {
      title: field("title"),
      authors: field("author").replace(/\s+and\s+/gi, ", "),
      year: field("year"),
      journal: field("journal") || field("booktitle") || field("venue"),
      doi: field("doi"),
    };
    const c = fromRecord(rec);
    if (c) out.push(c);
  }
  return out;
}

/** Parse pasted Elicit / Zotero / OpenAlex exports (JSON, CSV, or BibTeX). */
export function parseEvidencePaste(raw: string): Citation[] {
  const text = raw.trim();
  if (!text) return [];
  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      const jsonHits = parseJson(text);
      if (jsonHits.length) return jsonHits;
    } catch {
      /* fall through */
    }
  }
  if (/@\w+\s*\{/.test(text)) {
    const bib = parseBibtex(text);
    if (bib.length) return bib;
  }
  return parseCsv(text);
}
