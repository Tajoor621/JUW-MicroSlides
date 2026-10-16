import { z } from "zod";
import { reserveAiRequest } from "./ai-limits";
import { LEVELS } from "./types";
import { createServerFn } from "@tanstack/react-start";
import { lectureMeta } from "./brand";
import { generateLocalDeck } from "./generate-deck";

import { cycleTheme } from "./slide-themes";
import { MAX_SLIDES, type Citation, type Deck, type GenerateInput, type Slide } from "./types";
import { uid } from "./utils";

type AiOk = { ok: true; deck: Deck };
type AiAskOk = { ok: true; text: string };
type AiFail = { ok: false; error: string; deck?: Deck };

const SLIDE_SCHEMA = `{
  "title": string,
  "slides": [
    {
      "layout": "title" | "content" | "two-column" | "full-image" | "blank",
      "title": string,
      "subtitle": string,
      "bullets": string[],
      "leftBullets": string[],
      "rightBullets": string[],
      "notes": string
    }
  ]
}`;

export const generateAiDeck = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        topic: z.string().trim().min(1).max(500),
        discipline: z.string().max(200),
        count: z.number().int().min(1).max(MAX_SLIDES),
        level: z.enum(LEVELS),
        notes: z.string().max(10000),
        mode: z.enum(["manual", "ai"]),
        course: z.string().max(200).optional(),
        courseCode: z.string().max(100).optional(),
        preparedBy: z.string().max(200).optional(),
        department: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<AiOk | AiFail> => {
    const fallback = generateLocalDeck(data);
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        error: "AI is not available in this environment. Continuing with research generation for the requested slide count.",
        deck: fallback,
      };
    }

    if (!reserveAiRequest("deck"))
      return { ok: false, error: "AI request limit reached. Retry in a minute.", deck: fallback };
    const count = Math.min(MAX_SLIDES, Math.max(1, data.count || 18));
    if (count > 36) {
      return {
        ok: false,
        error:
          "This cloud model handles up to 36 slides per call. Continuing with research generation for the complete requested deck.",
        deck: fallback,
      };
    }
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      signal: AbortSignal.timeout(45000),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 6000,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You write undergraduate/graduate microbiology lecture slides for Jinnah University for Women. Be accurate, specific, and exam-useful. No emoji. Return JSON only.",
          },
          {
            role: "user",
            content: `Create a ${count}-slide lecture deck.
Topic: ${data.topic || data.discipline}
Discipline: ${data.discipline}
Level: ${data.level}
Instructor notes: ${data.notes || "none"}
JSON schema: ${SLIDE_SCHEMA}
First slide MUST be layout=title (official JUW intro: university crest, department seal, centred title). Include learning objectives, core content, a clinical or applied slide, take-homes, and a references slide with real classic papers (author, year, journal in bullets). Each content slide: 3–5 specific factual bullets. Use concise concept headings, without repeating the full topic name. Do not substitute generic teaching prompts or unrelated examples. Never invent references or sources. No media is attached automatically.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `xAI API error ${res.status}`, deck: fallback };
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content ?? "";
    const parsed = parseDeckJson(text, data);
    if (!parsed)
      return { ok: false, error: "The model returned an unreadable deck.", deck: fallback };
    const padded = padWithLocal(parsed, fallback, count);
    return { ok: true, deck: { ...padded, generationSource: "cloud-ai" } };
  });

export const askCopilot = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        question: z.string().max(2000),
        slideTitle: z.string().max(1000),
        slideBody: z.string().max(10000),
        refine: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<AiAskOk | AiFail> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        error: "AI copilot is unavailable here. Try Edit to rewrite bullets by hand.",
      };
    }
    if (!reserveAiRequest("copilot"))
      return { ok: false, error: "Copilot request limit reached. Retry in a minute." };
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      signal: AbortSignal.timeout(45000),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 500,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are a microbiology teaching copilot for JUW-MicroSlides. Be concise, accurate, no emoji. If refine=true, return JSON {title, bullets: string[3-6], notes}.",
          },
          {
            role: "user",
            content: `Slide title: ${data.slideTitle}\nSlide content:\n${data.slideBody}\nRefine: ${data.refine}\nQuestion: ${data.question || "Improve this slide for a lecture."}`,
          },
        ],
      }),
    });
    if (!res.ok) return { ok: false, error: `xAI API error ${res.status}` };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { ok: true, text: body.choices?.[0]?.message?.content ?? "" };
  });

export const searchPubmed = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ query: z.string().trim().min(1).max(500) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true; citations: Citation[] } | AiFail> => {
    const q = data.query.trim();
    if (!q) return { ok: false, error: "Enter a search term." };
    try {
      const search = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=6&term=${encodeURIComponent(q)}&tool=juwmicroslides&email=microslides@example.org`,
      );
      if (!search.ok) return { ok: false, error: `PubMed search failed (${search.status})` };
      const sjson = (await search.json()) as { esearchresult?: { idlist?: string[] } };
      const ids = sjson.esearchresult?.idlist ?? [];
      if (!ids.length) return { ok: true, citations: [] };
      const sum = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}&tool=juwmicroslides&email=microslides@example.org`,
      );
      if (!sum.ok) return { ok: false, error: `PubMed summary failed (${sum.status})` };
      const r = (await sum.json()) as {
        result?: Record<
          string,
          {
            title?: string;
            fulljournalname?: string;
            source?: string;
            pubdate?: string;
            sortfirstauthor?: string;
            authors?: { name: string }[];
            volume?: string;
            pages?: string;
            elocationid?: string;
          }
        >;
      };
      const citations = ids
        .map((id) => {
          const item = r.result?.[id];
          if (!item) return null;
          const authors =
            item.authors
              ?.slice(0, 3)
              .map((a) => a.name)
              .join(", ") ||
            item.sortfirstauthor ||
            "Unknown";
          const year = (item.pubdate || "").slice(0, 4);
          const doi = item.elocationid?.startsWith("doi:") ? item.elocationid.slice(4) : undefined;
          return {
            id: `pmid${id}`,
            pmid: id,
            authors,
            title: (item.title || "Untitled").replace(/\.$/, ""),
            journal: item.fulljournalname || item.source || "Journal",
            year,
            volume: item.volume,
            pages: item.pages,
            doi,
          } satisfies Citation;
        })
        .filter((c) => c !== null);
      return { ok: true, citations };
    } catch {
      return { ok: false, error: "Could not reach PubMed. Check the network and try again." };
    }
  });

export const searchOpenAlex = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ query: z.string().trim().min(1).max(500) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true; citations: Citation[] } | AiFail> => {
    const q = data.query.trim();
    if (!q) return { ok: false, error: "Enter a search term." };
    try {
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per_page=6&mailto=microslides@example.org`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return { ok: false, error: `OpenAlex search failed (${res.status})` };
      const body = (await res.json()) as {
        results?: Array<{
          id?: string;
          display_name?: string;
          publication_year?: number;
          doi?: string;
          authorships?: Array<{ author?: { display_name?: string } }>;
          primary_location?: { source?: { display_name?: string } };
        }>;
      };
      const citations: Citation[] = (body.results ?? []).map((work) => {
        const authors =
          work.authorships
            ?.slice(0, 3)
            .map((a) => a.author?.display_name)
            .filter((name): name is string => Boolean(name))
            .join(", ") || "Unknown";
        const doi = work.doi?.replace(/^https?:\/\/doi.org\//i, "");
        return {
          id: uid(work.id?.split("/").pop() || "oa"),
          authors,
          title: (work.display_name || "Untitled").replace(/\.$/, ""),
          journal: work.primary_location?.source?.display_name || "OpenAlex",
          year: work.publication_year ? String(work.publication_year) : "n.d.",
          doi,
        };
      });
      return { ok: true, citations };
    } catch {
      return { ok: false, error: "Could not reach OpenAlex. Try PubMed in the Cite tab." };
    }
  });

function padWithLocal(deck: Deck, local: Deck, count: number): Deck {
  if (deck.slides.length >= count) return { ...deck, slides: deck.slides.slice(0, count) };
  const titles = new Set(deck.slides.map((s) => s.title.trim().toLowerCase()));
  const extra: Slide[] = [...deck.slides];
  for (const s of local.slides) {
    if (extra.length >= count) break;
    const key = s.title.trim().toLowerCase();
    if (titles.has(key)) continue;
    titles.add(key);
    extra.push({ ...s, id: uid("s"), media: [] });
  }
  return { ...deck, slides: extra };
}

function parseDeckJson(raw: string, input: GenerateInput): Deck | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const validated = z
      .object({
        title: z.string().max(1000).optional(),
        slides: z
          .array(
            z.object({
              layout: z.enum(["title", "content", "two-column", "full-image", "blank"]).optional(),
              title: z.string().max(1000).optional(),
              subtitle: z.string().max(2000).optional(),
              bullets: z.array(z.string().max(3000)).max(20).optional(),
              leftBullets: z.array(z.string().max(3000)).max(20).optional(),
              rightBullets: z.array(z.string().max(3000)).max(20).optional(),
              notes: z.string().max(20000).optional(),
            }),
          )
          .min(1)
          .max(MAX_SLIDES),
      })
      .parse(JSON.parse(match[0]));
    const json = validated as {
      title?: string;
      slides?: Array<{
        layout?: Slide["layout"];
        title?: string;
        subtitle?: string;
        bullets?: string[];
        leftBullets?: string[];
        rightBullets?: string[];
        notes?: string;
      }>;
    };
    if (!json.slides?.length) return null;
    const seen = new Set<string>();
    const slides: Slide[] = [];
    for (const s of json.slides.slice(0, MAX_SLIDES)) {
      const title = s.title || "Untitled";
      const key = title.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      slides.push({
        id: uid("s"),
        layout: s.layout ?? "content",
        theme: cycleTheme(slides.length, s.layout ?? "content"),
        title,
        subtitle: s.subtitle || "",
        bullets: s.bullets ?? [],
        leftBullets: s.leftBullets ?? [],
        rightBullets: s.rightBullets ?? [],
        notes: s.notes || "",
        citations: [],
        media: [],
      });
    }
    if (!slides.length) return null;
    return {
      id: uid("deck"),
      title: json.title || `${input.topic} — ${input.discipline}`,
      topic: input.topic,
      discipline: input.discipline,
      level: input.level,
      citationStyle: "Vancouver",
      ...lectureMeta(input),
      slides,
      mediaPool: [],
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}
