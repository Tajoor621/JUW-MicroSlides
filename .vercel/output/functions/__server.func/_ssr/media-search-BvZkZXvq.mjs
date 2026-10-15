import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { i as uid, r as mediaKey } from "./utils-BGmVEDjx.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/media-search-BvZkZXvq.js
var UA = "JUW-MicroSlides/6.2.1 (educational lecture studio; open-source media)";
var FETCH_MS = 2800;
var proxyImages_createServerFn_handler = createServerRpc({
	id: "f688ff0d0a705c2661497a463e8c7adb64171ee6e6f00d35688c3b84f14822c2",
	name: "proxyImages",
	filename: "src/lib/media-search.ts"
}, (opts) => proxyImages.__executeServer(opts));
var proxyImages = createServerFn({ method: "POST" }).validator((input) => input).handler(proxyImages_createServerFn_handler, async ({ data }) => {
	const srcs = [...new Set(data.srcs.filter((s) => /^https?:\/\//i.test(s)))].slice(0, 120);
	const map = {};
	await mapPool(srcs, 6, async (src) => {
		try {
			const res = await fetch(src, {
				headers: {
					"User-Agent": UA,
					Accept: "image/avif,image/webp,image/*,*/*;q=0.8"
				},
				redirect: "follow",
				signal: AbortSignal.timeout(6e3)
			});
			if (!res.ok) return;
			const buf = Buffer.from(await res.arrayBuffer());
			if (buf.byteLength < 24 || buf.byteLength > 55e5) return;
			const headerMime = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
			const kind = looksLikeSvg(buf) || headerMime.includes("svg") ? "image/svg+xml" : headerMime.startsWith("image/") && !headerMime.includes("svg") ? headerMime : sniffImage(buf);
			if (!kind) return;
			map[src] = `data:${kind};base64,${buf.toString("base64")}`;
		} catch {}
	});
	return {
		ok: true,
		map
	};
});
var searchOpenMedia_createServerFn_handler = createServerRpc({
	id: "623077762b7cb7d1d4af849f130bad55c82655d44909333ea7e6b93dc106e3fe",
	name: "searchOpenMedia",
	filename: "src/lib/media-search.ts"
}, (opts) => searchOpenMedia.__executeServer(opts));
var searchOpenMedia = createServerFn({ method: "POST" }).validator((input) => input).handler(searchOpenMedia_createServerFn_handler, async ({ data }) => {
	const q = data.query.trim();
	if (!q) return {
		ok: false,
		error: "Enter a search term.",
		items: []
	};
	try {
		return {
			ok: true,
			items: (await searchAllSources(q, "deep")).slice(0, 64)
		};
	} catch {
		return {
			ok: false,
			error: "Open-source media search is unreachable. Catalog visuals are still available.",
			items: []
		};
	}
});
var collectDeckMedia_createServerFn_handler = createServerRpc({
	id: "946d244dce7e62d19b30c173ab81777bb4f9bc0e4b154c7748f7de3aed2d98e9",
	name: "collectDeckMedia",
	filename: "src/lib/media-search.ts"
}, (opts) => collectDeckMedia.__executeServer(opts));
var collectDeckMedia = createServerFn({ method: "POST" }).validator((input) => input).handler(collectDeckMedia_createServerFn_handler, async ({ data }) => {
	const slides = data.slides.slice(0, 400);
	if (!slides.length) return {
		ok: false,
		error: "No slides to illustrate.",
		items: []
	};
	try {
		const items = dedupe((await mapPool(uniqueQueries(data.topic, data.discipline, slides), 8, (q) => searchAllSources(q, "fast"))).flat());
		const { assigned, used } = assignUnique(slides, data.topic, items);
		return {
			ok: true,
			assigned,
			pool: items.filter((item) => !used.has(item.id) && !used.has(mediaKey(item.src))).slice(0, 64),
			items
		};
	} catch {
		return {
			ok: false,
			error: "Live archives were unreachable. Built-in open catalog will illustrate the deck.",
			items: []
		};
	}
});
async function searchAllSources(q, depth = "fast") {
	const jobs = [searchWikimedia(q), searchOpenverse(q)];
	if (depth === "deep") jobs.push(searchWikimedia(`${q} (diagram OR schematic OR cycle OR pathway OR chart)`), searchWikimedia(`${q} filetype:gif`), searchOpenverseGif(q), searchWellcome(q), searchINaturalist(q), searchNasa(q), searchLoc(q), searchGbif(q), searchWikipedia(q), searchCleveland(q), searchMet(q), searchArtic(q), searchArchive(q));
	return dedupe((await Promise.all(jobs)).flat());
}
async function searchWikimedia(q) {
	const res = await getJson(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=24&gsrsearch=${encodeURIComponent(`${q} -filetype:ogg -filetype:webm -filetype:pdf`)}&prop=imageinfo&iiprop=url|mime|extmetadata|size&iiurlwidth=900`);
	if (!res) return [];
	return Object.values(res.query?.pages ?? {}).map((page) => {
		const info = page.imageinfo?.[0];
		if (!info?.thumburl && !info?.url) return null;
		const mime = (info.mime || "").toLowerCase();
		if (mime.includes("tiff") || mime.includes("pdf") || mime.includes("djvu") || mime.startsWith("audio") || mime.startsWith("video")) return null;
		const title = (page.title || "Wikimedia file").replace(/^File:/, "").replace(/_/g, " ").replace(/\.[^.]+$/, "");
		const meta = info.extmetadata || {};
		return {
			id: `wiki-${page.pageid}`,
			kind: classifyKind(mime, title),
			title,
			src: info.thumburl || info.url || "",
			credit: stripHtml(meta.Artist?.value) || "Wikimedia Commons",
			source: "Wikimedia Commons",
			license: meta.LicenseShortName?.value || "Open licence",
			keywords: tokens(`${q} ${title}`)
		};
	}).filter((item) => Boolean(item));
}
async function searchOpenverse(q) {
	return parseOpenverse(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=20&mature=false&license_type=all`, q);
}
async function searchOpenverseGif(q) {
	return parseOpenverse(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=8&mature=false&license_type=all&extension=gif`, q);
}
async function parseOpenverse(url, q) {
	const res = await getJson(url);
	if (!res) return [];
	return (res.results ?? []).map((hit) => {
		const src = hit.thumbnail || hit.url;
		if (!src) return null;
		const title = hit.title || q;
		return {
			id: `ov-${hit.id || uid("ov")}`,
			kind: classifyKind(hit.filetype || "", title),
			title,
			src,
			credit: hit.creator || "Openverse",
			source: hit.source ? `Openverse / ${hit.source}` : "Openverse",
			license: (hit.license || "CC").toUpperCase(),
			keywords: tokens(`${q} ${title}`)
		};
	}).filter((item) => Boolean(item));
}
async function searchWellcome(q) {
	const res = await getJson(`https://api.wellcomecollection.org/catalogue/v2/images?query=${encodeURIComponent(q)}&pageSize=10`);
	if (!res) return [];
	return (res.results ?? []).map((hit) => {
		const src = hit.thumbnail?.url;
		if (!src || !hit.id) return null;
		const title = hit.source?.name || `Wellcome image ${hit.id}`;
		return {
			id: `wl-${hit.id}`,
			kind: classifyKind("", title),
			title,
			src,
			credit: "Wellcome Collection",
			source: "Wellcome Collection",
			license: "CC BY",
			keywords: tokens(`${q} ${title}`)
		};
	}).filter((item) => Boolean(item));
}
async function searchINaturalist(q) {
	const res = await getJson(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(q)}&is_active=true&per_page=8`);
	if (!res) return [];
	const body = res;
	const items = [];
	for (const taxon of body.results ?? []) {
		const photo = taxon.default_photo;
		const src = photo?.medium_url;
		const license = (photo?.license_code || "").toLowerCase();
		if (!src || !taxon.id) continue;
		if (license && !license.includes("cc") && license !== "cc0" && license !== "pd") continue;
		const title = taxon.preferred_common_name ? `${taxon.preferred_common_name} (${taxon.name})` : taxon.name || q;
		items.push({
			id: `inat-${taxon.id}`,
			kind: "photo",
			title,
			src,
			credit: photo?.attribution || "iNaturalist",
			source: "iNaturalist",
			license: (photo?.license_code || "CC").toUpperCase(),
			keywords: tokens(`${q} ${title}`)
		});
	}
	return items;
}
async function searchNasa(q) {
	const res = await getJson(`https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}&media_type=image`);
	if (!res) return [];
	return (res.collection?.items ?? []).slice(0, 8).map((hit) => {
		const data = hit.data?.[0];
		const src = hit.links?.find((l) => l.rel === "preview")?.href || hit.links?.[0]?.href;
		if (!src || !data?.nasa_id) return null;
		const title = data.title || q;
		return {
			id: `nasa-${data.nasa_id}`,
			kind: classifyKind("", title),
			title,
			src,
			credit: data.photographer || data.secondary_creator || "NASA",
			source: "NASA Image Library",
			license: "NASA media (public, credit NASA)",
			keywords: tokens(`${q} ${title}`)
		};
	}).filter((item) => Boolean(item));
}
async function searchLoc(q) {
	const res = await getJson(`https://www.loc.gov/photos/?q=${encodeURIComponent(q)}&fo=json&c=8`);
	if (!res) return [];
	return (res.results ?? []).map((hit) => {
		const src = hit.image?.full || hit.image?.square;
		if (!src) return null;
		const id = (hit.id || src).replace(/\W+/g, "").slice(-16);
		const title = hit.title || q;
		return {
			id: `loc-${id}`,
			kind: classifyKind("", title),
			title,
			src,
			credit: "Library of Congress",
			source: "Library of Congress",
			license: "LoC (rights vary; educational use)",
			keywords: tokens(`${q} ${title}`)
		};
	}).filter((item) => Boolean(item));
}
async function searchGbif(q) {
	const taxon = taxonName(q);
	if (!taxon) return [];
	const res = await getJson(`https://api.gbif.org/v1/occurrence/search?mediaType=StillImage&limit=8&scientificName=${encodeURIComponent(taxon)}`);
	if (!res) return [];
	const body = res;
	const items = [];
	for (const occ of body.results ?? []) {
		const media = occ.media?.[0];
		const src = media?.identifier;
		if (!src || !occ.key) continue;
		const title = occ.scientificName || q;
		items.push({
			id: `gbif-${occ.key}`,
			kind: "photo",
			title,
			src,
			credit: media?.creator || "GBIF",
			source: "GBIF",
			license: media?.license || "CC",
			keywords: tokens(`${q} ${title}`)
		});
	}
	return items;
}
async function searchWikipedia(q) {
	const titleGuess = q.split(/\s+/).slice(0, 6).join(" ");
	const res = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titleGuess)}`);
	if (!res) return [];
	const body = res;
	const src = body.thumbnail?.source || body.originalimage?.source;
	if (!src) return [];
	const title = body.title || titleGuess;
	return [{
		id: `wp-${title.replace(/\W+/g, "").slice(0, 24)}`,
		kind: classifyKind("", `${title} ${body.extract || ""}`),
		title,
		src,
		credit: "Wikipedia / Wikimedia",
		source: "Wikipedia",
		license: "CC BY-SA",
		keywords: tokens(`${q} ${title} ${body.extract || ""}`)
	}];
}
async function searchCleveland(q) {
	const res = await getJson(`https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(q)}&has_image=1&cc0=1&limit=6`);
	if (!res) return [];
	const body = res;
	const items = [];
	for (const hit of body.data ?? []) {
		const src = hit.images?.web?.url;
		if (!src || !hit.id) continue;
		const title = hit.title || q;
		items.push({
			id: `cma-${hit.id}`,
			kind: "photo",
			title,
			src,
			credit: hit.creditline || "Cleveland Museum of Art",
			source: "Cleveland Museum of Art",
			license: "CC0",
			keywords: tokens(`${q} ${title}`)
		});
	}
	return items;
}
async function searchMet(q) {
	const res = await getJson(`https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=${encodeURIComponent(q)}`);
	if (!res) return [];
	const ids = (res.objectIDs ?? []).slice(0, 4);
	const items = [];
	await Promise.all(ids.map(async (id) => {
		const obj = await getJson(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
		const src = obj?.primaryImageSmall || obj?.primaryImage;
		if (!src || !obj?.objectID) return;
		items.push({
			id: `met-${obj.objectID}`,
			kind: classifyKind("", obj.title || q),
			title: obj.title || q,
			src,
			credit: obj.artistDisplayName || "The Metropolitan Museum of Art",
			source: "The Met (Open Access)",
			license: "CC0 / Met Open Access",
			keywords: tokens(`${q} ${obj.title || ""}`)
		});
	}));
	return items;
}
async function searchArtic(q) {
	const res = await getJson(`https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(q)}&fields=id,title,image_id,artist_title&limit=6`);
	if (!res) return [];
	const body = res;
	const items = [];
	for (const hit of body.data ?? []) {
		if (!hit.id || !hit.image_id) continue;
		const title = hit.title || q;
		items.push({
			id: `artic-${hit.id}`,
			kind: classifyKind("", title),
			title,
			src: `https://www.artic.edu/iiif/2/${hit.image_id}/full/800,/0/default.jpg`,
			credit: hit.artist_title || "Art Institute of Chicago",
			source: "Art Institute of Chicago",
			license: "CC0 / AIC",
			keywords: tokens(`${q} ${title}`)
		});
	}
	return items;
}
async function searchArchive(q) {
	const res = await getJson(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(`(${q}) AND mediatype:(image)`)}&fl[]=identifier&fl[]=title&fl[]=creator&rows=8&output=json`);
	if (!res) return [];
	const body = res;
	const items = [];
	for (const hit of body.response?.docs ?? []) {
		if (!hit.identifier) continue;
		const title = hit.title || q;
		const creator = Array.isArray(hit.creator) ? hit.creator[0] : hit.creator;
		items.push({
			id: `ia-${hit.identifier}`,
			kind: classifyKind("", title),
			title,
			src: `https://archive.org/services/img/${hit.identifier}`,
			credit: creator || "Internet Archive",
			source: "Internet Archive",
			license: "IA (rights vary; educational use)",
			keywords: tokens(`${q} ${title}`)
		});
	}
	return items;
}
function uniqueQueries(topic, discipline, slides) {
	const out = [];
	const seen = /* @__PURE__ */ new Set();
	const push = (raw) => {
		const q = raw.replace(/\s+/g, " ").trim();
		const key = q.toLowerCase();
		if (q.length < 4 || seen.has(key)) return;
		seen.add(key);
		out.push(q);
	};
	push(`${topic} ${discipline} microbiology`);
	push(`${topic} microscopy`);
	push(`${topic} diagram`);
	push(`${topic} chart graph`);
	for (const slide of slides) {
		if (out.length >= 24) break;
		const distinctive = slideQuery(topic, slide);
		if (distinctive) push(distinctive);
	}
	return out;
}
function slideQuery(topic, slide) {
	const stop = /* @__PURE__ */ new Set([
		"learning",
		"objectives",
		"take",
		"home",
		"points",
		"selected",
		"references",
		"why",
		"matters",
		"this",
		"that",
		"with",
		"from",
		"into",
		"about",
		"using",
		"their",
		"have",
		"will",
		"slide",
		"lecture",
		"topic",
		"workshop",
		"students",
		"which",
		"what",
		"when",
		"your",
		"would"
	]);
	const words = `${slide.title} ${slide.text} ${topic}`.split(/[^a-zA-Z0-9]+/).filter((w) => w.length > 3 && !stop.has(w.toLowerCase()));
	return [...new Set(words)].slice(0, 6).join(" ");
}
function assignUnique(slides, topic, items) {
	const assigned = {};
	const usedS = /* @__PURE__ */ new Set();
	const used = /* @__PURE__ */ new Set();
	const scored = [];
	for (const slide of slides) {
		const terms = tokens(`${slide.title} ${slide.text} ${topic}`);
		const kinds = preferredKinds(slide);
		for (const item of items) scored.push({
			sid: slide.id,
			item,
			score: scoreItem(item, terms, slide.title, kinds)
		});
	}
	scored.sort((a, b) => b.score - a.score);
	for (const row of scored) {
		if (row.score < 1) continue;
		if (usedS.has(row.sid) || used.has(row.item.id) || used.has(mediaKey(row.item.src))) continue;
		assigned[row.sid] = row.item;
		usedS.add(row.sid);
		used.add(row.item.id);
		used.add(mediaKey(row.item.src));
	}
	for (const slide of slides) {
		if (assigned[slide.id]) continue;
		const leftover = items.find((item) => !used.has(item.id) && !used.has(mediaKey(item.src)));
		if (!leftover) continue;
		assigned[slide.id] = leftover;
		used.add(leftover.id);
		used.add(mediaKey(leftover.src));
	}
	return {
		assigned,
		used
	};
}
function preferredKinds(slide) {
	const t = `${slide.title} ${slide.text}`.toLowerCase();
	if (/chart|curve|plot|quantitative|kinetic|mic\b|growth/.test(t)) return [
		"chart",
		"diagram",
		"photo"
	];
	if (/diagram|cycle|pathway|mechanism|schematic|workflow/.test(t)) return [
		"diagram",
		"chart",
		"photo"
	];
	if (/gif|animation|motility|time-lapse/.test(t)) return [
		"gif",
		"micrograph",
		"photo"
	];
	if (/microscop|stain|gram|sem|tem|morpholog|organism/.test(t)) return [
		"micrograph",
		"photo",
		"gif"
	];
	return [
		"diagram",
		"micrograph",
		"photo",
		"chart",
		"gif"
	];
}
function scoreItem(item, terms, title, kinds) {
	const hay = `${item.title} ${item.keywords.join(" ")} ${item.kind}`.toLowerCase();
	let score = 0;
	for (const t of terms) {
		if (hay.includes(t)) score += 2;
		if (item.title.toLowerCase().includes(t)) score += 2;
	}
	if (title.toLowerCase().split(/\s+/).some((w) => w.length > 3 && item.title.toLowerCase().includes(w))) score += 5;
	const kindRank = kinds.indexOf(item.kind);
	if (kindRank >= 0) score += 3 - Math.min(kindRank, 3);
	if (item.kind === "diagram" || item.kind === "micrograph" || item.kind === "chart" || item.kind === "gif") score += 1;
	return score;
}
function classifyKind(mimeOrExt, title) {
	const m = mimeOrExt.toLowerCase();
	const t = title.toLowerCase();
	if (m.includes("gif") || t.endsWith("gif") || t.includes("animation") || t.includes("time-lapse")) return "gif";
	if (t.includes("chart") || t.includes("graph") || t.includes("plot") || t.includes("curve") || t.includes("kinetics")) return "chart";
	if (t.includes("diagram") || t.includes("schematic") || t.includes("cycle") || t.includes("pathway") || m.includes("svg")) return "diagram";
	if (t.includes("sem") || t.includes("tem") || t.includes("stain") || t.includes("microscop") || t.includes("gram")) return "micrograph";
	return "photo";
}
function tokens(s) {
	return [...new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2))].slice(0, 14);
}
function taxonName(q) {
	const binomial = q.match(/\b([A-Z][a-z]{2,} [a-z]{3,})\b/);
	if (binomial) return binomial[1];
	return [
		"Staphylococcus",
		"Streptococcus",
		"Escherichia",
		"Bacillus",
		"Candida",
		"Aspergillus",
		"Plasmodium",
		"Mycobacterium",
		"Salmonella",
		"Vibrio",
		"Helicobacter",
		"Lactobacillus",
		"Penicillium",
		"Pseudomonas",
		"Clostridium",
		"Neisseria",
		"Listeria",
		"Enterococcus",
		"Klebsiella",
		"Acinetobacter"
	].find((g) => q.toLowerCase().includes(g.toLowerCase())) ?? null;
}
function stripHtml(value) {
	return (value || "").replace(/<[^>]+>/g, "").replace(/&/g, "&").replace(/&nbsp;/g, " ").trim();
}
function dedupe(items) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const item of items) {
		if (!item.src) continue;
		const key = mediaKey(item.src);
		if (seen.has(item.id) || seen.has(key)) continue;
		seen.add(item.id);
		seen.add(key);
		out.push(item);
	}
	return out;
}
async function getJson(url) {
	try {
		const res = await fetch(url, {
			headers: {
				"User-Agent": UA,
				Accept: "application/json"
			},
			signal: AbortSignal.timeout(FETCH_MS)
		});
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}
async function mapPool(items, n, fn) {
	const out = new Array(items.length);
	let i = 0;
	async function worker() {
		while (i < items.length) {
			const idx = i++;
			out[idx] = await fn(items[idx], idx);
		}
	}
	await Promise.all(Array.from({ length: Math.min(n, items.length) }, () => worker()));
	return out;
}
function looksLikeSvg(buf) {
	return buf.subarray(0, 180).toString("utf8").toLowerCase().includes("<svg");
}
function sniffImage(buf) {
	if (buf[0] === 255 && buf[1] === 216) return "image/jpeg";
	if (buf[0] === 137 && buf[1] === 80) return "image/png";
	if (buf[0] === 71 && buf[1] === 73) return "image/gif";
	if (buf[0] === 82 && buf[1] === 73) return "image/webp";
	if (looksLikeSvg(buf)) return "image/svg+xml";
	return null;
}
//#endregion
export { collectDeckMedia_createServerFn_handler, proxyImages_createServerFn_handler, searchOpenMedia_createServerFn_handler };
