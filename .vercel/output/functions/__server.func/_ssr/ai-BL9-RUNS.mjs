import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { i as uid } from "./utils-BGmVEDjx.mjs";
import { l as attachUniqueMedia, m as lectureMeta, p as generateLocalDeck, u as cycleTheme } from "./generate-deck-Ame9wj-B.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ai-BL9-RUNS.js
var SLIDE_SCHEMA = `{
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
var generateAiDeck_createServerFn_handler = createServerRpc({
	id: "d6b2126f54fc21bfba383e40403e518078aaacac2a76c91dbca9f74cef2bab6a",
	name: "generateAiDeck",
	filename: "src/lib/ai.ts"
}, (opts) => generateAiDeck.__executeServer(opts));
var generateAiDeck = createServerFn({ method: "POST" }).validator((input) => input).handler(generateAiDeck_createServerFn_handler, async ({ data }) => {
	const fallback = generateLocalDeck(data);
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: false,
		error: "AI is not available in this environment. A knowledge-based deck was built instead.",
		deck: fallback
	};
	const count = Math.min(400, Math.max(1, data.count || 18));
	if (count > 36) return {
		ok: true,
		deck: fallback
	};
	const res = await fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: "grok-4.5",
			max_tokens: 6e3,
			temperature: .4,
			messages: [{
				role: "system",
				content: "You write undergraduate/graduate microbiology lecture slides for Jinnah University for Women. Be accurate, specific, and exam-useful. No emoji. Return JSON only."
			}, {
				role: "user",
				content: `Create a ${count}-slide lecture deck.
Topic: ${data.topic || data.discipline}
Discipline: ${data.discipline}
Level: ${data.level}
Instructor notes: ${data.notes || "none"}
JSON schema: ${SLIDE_SCHEMA}
First slide MUST be layout=title (official JUW intro: university crest, department seal, centred title). Include learning objectives, core content, a clinical or applied slide, take-homes, and a references slide with real classic papers (author, year, journal in bullets). Each content slide: 3–5 dense bullets.`
			}]
		})
	});
	if (!res.ok) return {
		ok: false,
		error: `xAI API error ${res.status}`,
		deck: fallback
	};
	const parsed = parseDeckJson((await res.json()).choices?.[0]?.message?.content ?? "", data);
	if (!parsed) return {
		ok: false,
		error: "The model returned an unreadable deck.",
		deck: fallback
	};
	const padded = padWithLocal(parsed, fallback, count);
	return {
		ok: true,
		deck: attachUniqueMedia(padded)
	};
});
var askCopilot_createServerFn_handler = createServerRpc({
	id: "d22813eaee0ca85f09d47fc0658f45b92956f08943136c8243ec14b84014df71",
	name: "askCopilot",
	filename: "src/lib/ai.ts"
}, (opts) => askCopilot.__executeServer(opts));
var askCopilot = createServerFn({ method: "POST" }).validator((input) => input).handler(askCopilot_createServerFn_handler, async ({ data }) => {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: false,
		error: "AI copilot is unavailable here. Try Edit to rewrite bullets by hand."
	};
	const res = await fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: "grok-4.5",
			max_tokens: 500,
			temperature: .3,
			messages: [{
				role: "system",
				content: "You are a microbiology teaching copilot for JUW-MicroSlides. Be concise, accurate, no emoji. If refine=true, return JSON {title, bullets: string[3-6], notes}."
			}, {
				role: "user",
				content: `Slide title: ${data.slideTitle}\nSlide content:\n${data.slideBody}\nRefine: ${data.refine}\nQuestion: ${data.question || "Improve this slide for a lecture."}`
			}]
		})
	});
	if (!res.ok) return {
		ok: false,
		error: `xAI API error ${res.status}`
	};
	return {
		ok: true,
		text: (await res.json()).choices?.[0]?.message?.content ?? ""
	};
});
var searchPubmed_createServerFn_handler = createServerRpc({
	id: "5fb0bb9f6714c06fa0b819dc807bd7efd7d6d5aab900a93432f0107c0e8ea68d",
	name: "searchPubmed",
	filename: "src/lib/ai.ts"
}, (opts) => searchPubmed.__executeServer(opts));
var searchPubmed = createServerFn({ method: "POST" }).validator((input) => input).handler(searchPubmed_createServerFn_handler, async ({ data }) => {
	const q = data.query.trim();
	if (!q) return {
		ok: false,
		error: "Enter a search term."
	};
	try {
		const search = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=6&term=${encodeURIComponent(q)}&tool=juwmicroslides&email=microslides@example.org`);
		if (!search.ok) return {
			ok: false,
			error: `PubMed search failed (${search.status})`
		};
		const ids = (await search.json()).esearchresult?.idlist ?? [];
		if (!ids.length) return {
			ok: true,
			citations: []
		};
		const sum = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}&tool=juwmicroslides&email=microslides@example.org`);
		if (!sum.ok) return {
			ok: false,
			error: `PubMed summary failed (${sum.status})`
		};
		const r = await sum.json();
		return {
			ok: true,
			citations: ids.map((id) => {
				const item = r.result?.[id];
				if (!item) return null;
				const authors = item.authors?.slice(0, 3).map((a) => a.name).join(", ") || item.sortfirstauthor || "Unknown";
				const year = (item.pubdate || "").slice(0, 4);
				const doi = item.elocationid?.startsWith("doi:") ? item.elocationid.slice(4) : void 0;
				return {
					id: `pmid${id}`,
					pmid: id,
					authors,
					title: (item.title || "Untitled").replace(/\.$/, ""),
					journal: item.fulljournalname || item.source || "Journal",
					year,
					volume: item.volume,
					pages: item.pages,
					doi
				};
			}).filter((c) => c !== null)
		};
	} catch {
		return {
			ok: false,
			error: "Could not reach PubMed. Check the network and try again."
		};
	}
});
var searchOpenAlex_createServerFn_handler = createServerRpc({
	id: "4ae808d303a482e6635803e75140947c7a3f86249a50710639f25c7d9a49e273",
	name: "searchOpenAlex",
	filename: "src/lib/ai.ts"
}, (opts) => searchOpenAlex.__executeServer(opts));
var searchOpenAlex = createServerFn({ method: "POST" }).validator((input) => input).handler(searchOpenAlex_createServerFn_handler, async ({ data }) => {
	const q = data.query.trim();
	if (!q) return {
		ok: false,
		error: "Enter a search term."
	};
	try {
		const url = `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per_page=6&mailto=microslides@example.org`;
		const res = await fetch(url, { headers: { Accept: "application/json" } });
		if (!res.ok) return {
			ok: false,
			error: `OpenAlex search failed (${res.status})`
		};
		return {
			ok: true,
			citations: ((await res.json()).results ?? []).map((work) => {
				const authors = work.authorships?.slice(0, 3).map((a) => a.author?.display_name).filter((name) => Boolean(name)).join(", ") || "Unknown";
				const doi = work.doi?.replace(/^https?:\/\/doi.org\//i, "");
				return {
					id: uid(work.id?.split("/").pop() || "oa"),
					authors,
					title: (work.display_name || "Untitled").replace(/\.$/, ""),
					journal: work.primary_location?.source?.display_name || "OpenAlex",
					year: work.publication_year ? String(work.publication_year) : "n.d.",
					doi
				};
			})
		};
	} catch {
		return {
			ok: false,
			error: "Could not reach OpenAlex. Try PubMed in the Cite tab."
		};
	}
});
function padWithLocal(deck, local, count) {
	if (deck.slides.length >= count) return {
		...deck,
		slides: deck.slides.slice(0, count)
	};
	const titles = new Set(deck.slides.map((s) => s.title.trim().toLowerCase()));
	const extra = [...deck.slides];
	for (const s of local.slides) {
		if (extra.length >= count) break;
		const key = s.title.trim().toLowerCase();
		if (titles.has(key)) continue;
		titles.add(key);
		extra.push({
			...s,
			id: uid("s"),
			media: []
		});
	}
	return {
		...deck,
		slides: extra
	};
}
function parseDeckJson(raw, input) {
	const match = raw.match(/\{[\s\S]*\}/);
	if (!match) return null;
	try {
		const json = JSON.parse(match[0]);
		if (!json.slides?.length) return null;
		const seen = /* @__PURE__ */ new Set();
		const slides = [];
		for (const s of json.slides.slice(0, 400)) {
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
				media: []
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
			updatedAt: Date.now()
		};
	} catch {
		return null;
	}
}
//#endregion
export { askCopilot_createServerFn_handler, generateAiDeck_createServerFn_handler, searchOpenAlex_createServerFn_handler, searchPubmed_createServerFn_handler };
