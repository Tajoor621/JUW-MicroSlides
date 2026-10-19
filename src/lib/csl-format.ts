import { Cite, plugins } from "@citation-js/core";
import "@citation-js/plugin-csl";
import nature from "./csl/nature.csl?raw";
import ama from "./csl/ama.csl?raw";
import harvard from "./csl/harvard.csl?raw";
import type { Citation, CitationStyle } from "./types";
const config = plugins.config.get("@csl");
config.styles.add("juw-nature", nature);
config.styles.add("juw-ama", ama);
config.styles.add("juw-harvard", harvard);
const templates = {
  APA: "apa",
  Vancouver: "vancouver",
  Harvard: "juw-harvard",
  Nature: "juw-nature",
  AMA: "juw-ama",
};
const cache = new Map<string, string>();
function names(c: Citation) {
  if (c.cslAuthors?.length) return c.cslAuthors;
  // Preserve ambiguous legacy author strings rather than guessing given/family names.
  return c.authors.split(/;\s*|,\s*(?=[^,]+(?:,|$))/).map((name) => {
    const match = /^(.+?)\s+([A-Z]{1,5})$/.exec(name.trim());
    return match
      ? { family: match[1], given: match[2].split("").join(" ") }
      : { literal: name.trim() };
  });
}
export function cslCitation(c: Citation, style: CitationStyle) {
  const key = JSON.stringify([c, style]);
  const hit = cache.get(key);
  if (hit) return hit;
  const item = citationCslData(c);
  const text = String(
    new Cite([item]).format("bibliography", {
      format: "text",
      template: templates[style],
      lang: "en-US",
    }),
  )
    .trim()
    .replace(/^\d+\.\s+/, "");
  if (cache.size > 2000) cache.clear();
  cache.set(key, text);
  return text;
}

export function citationCslData(c: Citation) {
  const year = Number.parseInt(c.year, 10);
  let raw: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(c.cslJson || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      raw = parsed as Record<string, unknown>;
  } catch {
    /* Invalid optional metadata must not break citation export. */
  }
  return {
    ...raw,
    id: c.id,
    type: c.type || (raw.type as string) || "article-journal",
    title: c.title,
    author: names(c),
    "container-title": c.journal,
    volume: c.volume,
    page: c.pages,
    DOI: c.doi,
    URL: c.url,
    publisher: c.publisher || raw.publisher,
    ...(c.accessed && /^\d{4}-\d{2}-\d{2}$/.test(c.accessed)
      ? { accessed: { "date-parts": [c.accessed.split("-").map(Number)] } }
      : {}),
    ...(Number.isFinite(year) ? { issued: { "date-parts": [[year]] as [[number]] } } : {}),
  };
}
