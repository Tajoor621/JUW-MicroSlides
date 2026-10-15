import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { i as uid, n as mediaDisplaySrc, r as mediaKey, t as cn } from "./utils-BGmVEDjx.mjs";
import { S as withOfficialIntro, _ as suggestDiscipline, a as LEVELS, b as themeOf, c as applyCollectedMedia, d as fallbackVisual, f as formatCitation, g as searchMedia, h as sampleDeck, i as LAYOUTS, l as attachUniqueMedia, m as lectureMeta, n as DISCIPLINES, o as SLIDE_THEMES, p as generateLocalDeck, r as JUW, s as THEME_TOKENS, t as CITATION_STYLES, u as cycleTheme, v as suggestMediaForText, x as themeVars, y as takeUniqueMedia } from "./generate-deck-Ame9wj-B.mjs";
import { _ as ChevronLeft, a as Settings, c as Play, d as Moon, f as Microscope, g as ChevronRight, h as ChevronUp, i as Sun, l as PanelRight, m as Download, o as Printer, p as Library, r as Trash2, s as Plus, t as X, u as PanelLeft, v as ChevronDown } from "../_libs/lucide-react.mjs";
import { n as toast, t as Toaster } from "../_libs/sonner.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { a as DialogOverlay, g as Slot, i as DialogDescription$1, n as DialogClose, o as DialogPortal, r as DialogContent$1, s as DialogTitle$1, t as Dialog$1 } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { t as Root } from "../_libs/radix-ui__react-label.mjs";
import { i as Viewport, n as Scrollbar, r as Thumb, t as Root$1 } from "../_libs/radix-ui__react-scroll-area.mjs";
import { a as Trigger, i as Root3, n as Portal, r as Provider, t as Content2 } from "../_libs/@radix-ui/react-tooltip+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Du5K-GLC.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var MAX_LIBRARY = 24;
function bump(deck, slides) {
	return {
		...deck,
		slides: slides ?? deck.slides,
		updatedAt: Date.now()
	};
}
var STARTER = sampleDeck();
var EMPTY_DRAFT = {
	topic: "",
	discipline: "General Microbiology",
	count: 18,
	level: "Undergraduate",
	notes: "",
	course: lectureMeta({}).course,
	courseCode: lectureMeta({}).courseCode,
	preparedBy: lectureMeta({}).preparedBy,
	mode: "manual"
};
var useDeckStore = create()(persist((set, get) => ({
	library: [STARTER],
	activeId: STARTER.id,
	selectedIndex: 0,
	inspectorTab: "edit",
	citationStyle: "Vancouver",
	chromeTheme: "dark",
	railOpen: false,
	inspectorOpen: false,
	presenting: false,
	generateOpen: false,
	libraryOpen: false,
	settingsOpen: false,
	generatorOpen: true,
	generationMode: "manual",
	generateDraft: EMPTY_DRAFT,
	hydrateSample: () => {
		if (get().library.filter((d) => d.slides.length > 0).length > 0) return;
		const deck = sampleDeck();
		set({
			library: [deck],
			activeId: deck.id,
			selectedIndex: 0
		});
	},
	deck: () => get().library.find((d) => d.id === get().activeId) ?? get().library[0] ?? null,
	slide: () => {
		const d = get().deck();
		if (!d) return null;
		return d.slides[get().selectedIndex] ?? d.slides[0] ?? null;
	},
	setTab: (inspectorTab) => set({ inspectorTab }),
	setTheme: (chromeTheme) => set({ chromeTheme }),
	setCitationStyle: (citationStyle) => set({ citationStyle }),
	toggleRail: () => set({ railOpen: !get().railOpen }),
	toggleInspector: () => set({ inspectorOpen: !get().inspectorOpen }),
	setPresenting: (presenting) => set({ presenting }),
	setGenerateOpen: (generateOpen) => set({ generateOpen }),
	setLibraryOpen: (libraryOpen) => set({ libraryOpen }),
	setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
	setGeneratorOpen: (generatorOpen) => set({ generatorOpen }),
	patchGenerateDraft: (patch) => set({ generateDraft: {
		...get().generateDraft,
		...patch
	} }),
	select: (index) => {
		const d = get().deck();
		if (!d) return;
		set({ selectedIndex: Math.max(0, Math.min(index, d.slides.length - 1)) });
	},
	addSlide: () => {
		const d = get().deck();
		if (!d) return;
		const used = /* @__PURE__ */ new Set();
		d.slides.forEach((s) => s.media.forEach((m) => {
			used.add(m.id);
			used.add(mediaKey(m.src));
		}));
		const media = (d.mediaPool ?? []).find((m) => !used.has(m.id) && !used.has(mediaKey(m.src))) ?? takeUniqueMedia(`${d.topic} ${d.discipline} new slide ${d.slides.length + 1}`, used);
		const slide = {
			id: uid("s"),
			layout: "content",
			theme: cycleTheme(d.slides.length, "content"),
			title: "New slide",
			subtitle: "",
			bullets: ["Add a teaching point."],
			leftBullets: [],
			rightBullets: [],
			notes: "",
			citations: [],
			media: [media]
		};
		const slides = [...d.slides, slide];
		const mediaPool = (d.mediaPool ?? []).filter((m) => m.id !== media.id && mediaKey(m.src) !== mediaKey(media.src));
		const next = bump({
			...d,
			mediaPool
		}, slides);
		set({
			library: get().library.map((x) => x.id === next.id ? next : x),
			selectedIndex: slides.length - 1
		});
	},
	removeSlide: (index) => {
		const d = get().deck();
		if (!d || d.slides.length <= 1) return;
		const slides = d.slides.filter((_, i) => i !== index);
		const next = bump(d, slides);
		set({
			library: get().library.map((x) => x.id === next.id ? next : x),
			selectedIndex: Math.max(0, Math.min(get().selectedIndex, slides.length - 1))
		});
	},
	moveSlide: (index, dir) => {
		const d = get().deck();
		if (!d) return;
		const j = index + dir;
		if (j < 0 || j >= d.slides.length) return;
		const slides = d.slides.slice();
		const [item] = slides.splice(index, 1);
		slides.splice(j, 0, item);
		const next = bump(d, slides);
		set({
			library: get().library.map((x) => x.id === next.id ? next : x),
			selectedIndex: j
		});
	},
	patchSlide: (index, patch) => {
		const d = get().deck();
		if (!d) return;
		const next = bump(d, d.slides.map((s, i) => i === index ? {
			...s,
			...patch
		} : s));
		set({ library: get().library.map((x) => x.id === next.id ? next : x) });
	},
	patchDeck: (patch) => {
		const d = get().deck();
		if (!d) return;
		const next = bump({
			...d,
			...patch
		});
		set({ library: get().library.map((x) => x.id === next.id ? next : x) });
	},
	renameTopic: (title) => {
		const d = get().deck();
		const generateDraft = {
			...get().generateDraft,
			topic: title
		};
		if (!d) {
			set({ generateDraft });
			return;
		}
		const slides = d.slides.map((s, i) => i === 0 && s.layout === "title" ? {
			...s,
			title,
			theme: "classic"
		} : s);
		const next = bump({
			...d,
			title,
			topic: title.trim() || d.topic
		}, slides);
		set({
			generateDraft,
			selectedIndex: 0,
			library: get().library.map((x) => x.id === next.id ? next : x)
		});
	},
	setLayout: (layout) => {
		const i = get().selectedIndex;
		get().patchSlide(i, { layout });
	},
	attachMedia: (media) => {
		const d = get().deck();
		const s = get().slide();
		if (!d || !s) return;
		const key = mediaKey(media.src);
		if (s.media.some((m) => m.id === media.id || mediaKey(m.src) === key)) return;
		if (d.slides.some((sl, i) => i !== get().selectedIndex && sl.media.some((m) => m.id === media.id || mediaKey(m.src) === key))) return;
		const slides = d.slides.map((sl, i) => i === get().selectedIndex ? {
			...sl,
			media: [media]
		} : sl);
		const mediaPool = (d.mediaPool ?? []).filter((m) => m.id !== media.id && mediaKey(m.src) !== key);
		const next = bump({
			...d,
			mediaPool
		}, slides);
		set({ library: get().library.map((x) => x.id === next.id ? next : x) });
	},
	removeMedia: (mediaId) => {
		const d = get().deck();
		const s = get().slide();
		if (!d || !s) return;
		const removed = s.media.find((m) => m.id === mediaId);
		const remaining = s.media.filter((m) => m.id !== mediaId);
		const used = /* @__PURE__ */ new Set();
		d.slides.forEach((sl, i) => {
			if (i === get().selectedIndex) return;
			sl.media.forEach((m) => {
				used.add(m.id);
				used.add(mediaKey(m.src));
			});
		});
		let media = remaining;
		let mediaPool = [...d.mediaPool ?? []];
		if (removed && !mediaPool.some((m) => m.id === removed.id || mediaKey(m.src) === mediaKey(removed.src))) mediaPool = [removed, ...mediaPool];
		if (media.length === 0) {
			const nextMedia = mediaPool.find((m) => !used.has(m.id) && !used.has(mediaKey(m.src))) ?? takeUniqueMedia(`${s.title} ${d.topic}`, used);
			media = [nextMedia];
			mediaPool = mediaPool.filter((m) => m.id !== nextMedia.id && mediaKey(m.src) !== mediaKey(nextMedia.src));
		}
		const slides = d.slides.map((sl, i) => i === get().selectedIndex ? {
			...sl,
			media
		} : sl);
		const next = bump({
			...d,
			mediaPool
		}, slides);
		set({ library: get().library.map((x) => x.id === next.id ? next : x) });
	},
	attachCitation: (citation) => {
		const s = get().slide();
		if (!s) return;
		if (s.citations.some((c) => c.id === citation.id)) return;
		get().patchSlide(get().selectedIndex, { citations: [...s.citations, citation] });
	},
	removeCitation: (citationId) => {
		const s = get().slide();
		if (!s) return;
		get().patchSlide(get().selectedIndex, { citations: s.citations.filter((c) => c.id !== citationId) });
	},
	replaceActive: (deck) => {
		set({
			library: [deck, ...get().library.filter((d) => d.id !== deck.id)].slice(0, MAX_LIBRARY),
			activeId: deck.id,
			selectedIndex: 0
		});
	},
	generate: (input, deck) => {
		const made = attachUniqueMedia(withOfficialIntro(deck ?? generateLocalDeck(input), input));
		made.citationStyle = get().citationStyle;
		get().replaceActive(made);
		set({
			generateOpen: false,
			generatorOpen: true,
			generationMode: input.mode,
			inspectorTab: "edit",
			inspectorOpen: true,
			selectedIndex: 0,
			generateDraft: {
				...get().generateDraft,
				topic: input.topic,
				discipline: input.discipline,
				count: input.count,
				mode: input.mode
			}
		});
		if (typeof document !== "undefined") queueMicrotask(() => {
			const stage = document.querySelector("[data-slide-stage]");
			const scroller = stage?.closest("main");
			if (!stage || !(scroller instanceof HTMLElement)) return;
			const top = stage.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 8;
			scroller.scrollTo({
				top: Math.max(0, top),
				behavior: "smooth"
			});
		});
	},
	saveCopy: () => {
		const d = get().deck();
		if (!d) return;
		const copy = {
			...d,
			id: uid("deck"),
			title: `${d.title} (copy)`,
			updatedAt: Date.now(),
			slides: d.slides.map((s) => ({
				...s,
				id: uid("s")
			}))
		};
		set({
			library: [copy, ...get().library].slice(0, MAX_LIBRARY),
			activeId: copy.id
		});
	},
	loadDeck: (id) => {
		if (!get().library.find((d) => d.id === id)) return;
		set({
			activeId: id,
			selectedIndex: 0,
			libraryOpen: false
		});
	},
	deleteDeck: (id) => {
		const lib = get().library.filter((d) => d.id !== id);
		set({
			library: lib,
			activeId: get().activeId === id ? lib[0]?.id ?? null : get().activeId,
			selectedIndex: 0
		});
	}
}), {
	name: "juw-microslides-v661-intro-logo",
	partialize: (s) => ({
		library: s.library.filter((d) => d.slides.length > 0),
		activeId: s.activeId,
		selectedIndex: s.selectedIndex,
		citationStyle: s.citationStyle,
		chromeTheme: s.chromeTheme,
		generationMode: s.generationMode,
		generateDraft: s.generateDraft
	}),
	merge: (persisted, current) => {
		const p = persisted || {};
		const pLib = (p.library ?? []).filter((d) => d.slides.length > 0);
		const cLib = current.library.filter((d) => d.slides.length > 0);
		const newest = (lib) => Math.max(0, ...lib.map((d) => d.updatedAt || 0));
		const lib = newest(cLib) > newest(pLib) && cLib.length ? cLib : pLib.length ? pLib : cLib;
		if (!lib.length) return current;
		const preferredId = newest(cLib) > newest(pLib) ? current.activeId : p.activeId;
		const activeId = lib.some((d) => d.id === preferredId) ? preferredId : lib[0].id;
		return {
			...current,
			...p,
			library: lib,
			activeId,
			generateDraft: {
				...current.generateDraft,
				...p.generateDraft ?? {}
			}
		};
	}
}));
if (typeof window !== "undefined") {
	const boot = () => useDeckStore.getState().hydrateSample();
	queueMicrotask(boot);
	useDeckStore.persist.onFinishHydration(boot);
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var proxyImages = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("f688ff0d0a705c2661497a463e8c7adb64171ee6e6f00d35688c3b84f14822c2"));
var searchOpenMedia = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("623077762b7cb7d1d4af849f130bad55c82655d44909333ea7e6b93dc106e3fe"));
var collectDeckMedia = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("946d244dce7e62d19b30c173ab81777bb4f9bc0e4b154c7748f7de3aed2d98e9"));
function blobToDataUrl(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result || ""));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}
function absoluteSrc(src) {
	if (!src) return src;
	if (src.startsWith("data:") || src.startsWith("blob:") || /^https?:/i.test(src)) return src;
	if (typeof window === "undefined") return src;
	try {
		return new URL(src, window.location.origin).href;
	} catch {
		return src;
	}
}
function isRasterDataUrl(src) {
	return /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(src) && src.length > 80;
}
function isPptxSafeRaster(src) {
	return /^data:image\/(png|jpe?g);base64,/i.test(src) && src.length > 80;
}
function asJpegDataUrl(src) {
	return src.replace(/^data:image\/jpg;/i, "data:image/jpeg;");
}
function paintCard(title) {
	const canvas = document.createElement("canvas");
	canvas.width = 1280;
	canvas.height = 720;
	const ctx = canvas.getContext("2d");
	if (!ctx) return "";
	ctx.fillStyle = "#f7f4ec";
	ctx.fillRect(0, 0, 1280, 720);
	ctx.strokeStyle = "#954a33";
	ctx.lineWidth = 8;
	ctx.strokeRect(24, 24, 1232, 672);
	ctx.fillStyle = "#0b1520";
	ctx.font = "600 36px Georgia, serif";
	ctx.fillText((title || "Lecture figure").slice(0, 64), 64, 120);
	ctx.fillStyle = "#4e8ea8";
	ctx.fillRect(64, 148, 120, 8);
	ctx.fillStyle = "#5c6b7a";
	ctx.font = "22px Calibri, sans-serif";
	ctx.fillText("JUW-MicroSlides teaching figure", 64, 200);
	ctx.fillStyle = "#c5d4de";
	ctx.fillRect(64, 260, 1152, 380);
	ctx.strokeStyle = "#2f6f86";
	ctx.lineWidth = 6;
	ctx.beginPath();
	ctx.moveTo(120, 580);
	ctx.lineTo(320, 420);
	ctx.lineTo(520, 500);
	ctx.lineTo(760, 320);
	ctx.lineTo(1080, 540);
	ctx.stroke();
	return canvas.toDataURL("image/jpeg", .9);
}
function rasterizeBitmap(img, w, h, max = 1400) {
	const width = Math.max(1, w);
	const height = Math.max(1, h);
	const scale = Math.min(1, max / Math.max(width, height));
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(width * scale));
	canvas.height = Math.max(1, Math.round(height * scale));
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("canvas");
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
	return canvas.toDataURL("image/jpeg", .88);
}
function loadImage(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.referrerPolicy = "no-referrer";
		const timer = window.setTimeout(() => reject(/* @__PURE__ */ new Error("timeout")), 8e3);
		img.onload = () => {
			window.clearTimeout(timer);
			resolve(img);
		};
		img.onerror = () => {
			window.clearTimeout(timer);
			reject(/* @__PURE__ */ new Error("image load failed"));
		};
		img.src = src;
	});
}
function decodeSvg(src) {
	if (src.startsWith("data:image/svg")) {
		const comma = src.indexOf(",");
		if (comma < 0) return null;
		const payload = src.slice(comma + 1);
		try {
			return src.includes(";base64") ? atob(payload) : decodeURIComponent(payload);
		} catch {
			return null;
		}
	}
	if (src.trim().startsWith("<svg")) return src;
	return null;
}
function withSvgSize(svg, w = 1280, h = 720) {
	if (/\bwidth\s*=/.test(svg) && /\bheight\s*=/.test(svg)) return svg;
	return svg.replace(/<svg\b/i, `<svg width="${w}" height="${h}"`);
}
async function svgToJpeg(svg) {
	const sized = withSvgSize(svg);
	const blob = new Blob([sized], { type: "image/svg+xml;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	try {
		const img = await loadImage(url);
		return rasterizeBitmap(img, img.naturalWidth || img.width || 1280, img.naturalHeight || img.height || 720);
	} catch {
		try {
			const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`);
			return rasterizeBitmap(img, img.naturalWidth || 1280, img.naturalHeight || 720);
		} catch {
			return null;
		}
	} finally {
		URL.revokeObjectURL(url);
	}
}
async function rasterizeBlob(blob) {
	if (!blob.size) return null;
	const type = (blob.type || "").toLowerCase();
	if (type.includes("svg") || type.includes("xml") || type === "text/plain") {
		const text = await blob.text();
		if (text.includes("<svg")) return svgToJpeg(text);
	}
	if (/^image\/(jpeg|jpg|png)$/i.test(type) && blob.size > 24) try {
		const url = await blobToDataUrl(blob);
		if (isPptxSafeRaster(url)) return asJpegDataUrl(url);
	} catch {}
	const objectUrl = URL.createObjectURL(blob);
	try {
		const img = await loadImage(objectUrl);
		return rasterizeBitmap(img, img.naturalWidth || 1280, img.naturalHeight || 720);
	} catch {
		return null;
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}
async function fetchEmbeddable(src) {
	try {
		const res = await fetch(absoluteSrc(src), { referrerPolicy: "no-referrer" });
		if (!res.ok) return null;
		return rasterizeBlob(await res.blob());
	} catch {
		return null;
	}
}
async function toEmbeddable(src) {
	if (!src) return null;
	if (isPptxSafeRaster(src)) return asJpegDataUrl(src);
	if (isRasterDataUrl(src)) try {
		const img = await loadImage(src);
		return rasterizeBitmap(img, img.naturalWidth || 1280, img.naturalHeight || 720);
	} catch {}
	const svg = decodeSvg(src);
	if (svg) return svgToJpeg(svg);
	return fetchEmbeddable(src);
}
async function asPptxImage(src, proxied, fallbackTitle = "Figure") {
	const display = mediaDisplaySrc(src);
	const candidates = [
		proxied,
		display,
		src,
		src ? absoluteSrc(display) : ""
	].filter((s, i, arr) => Boolean(s) && arr.indexOf(s) === i);
	for (const candidate of candidates) {
		const jpeg = await toEmbeddable(candidate);
		if (jpeg && isPptxSafeRaster(jpeg)) return jpeg;
	}
	try {
		const jpeg = await toEmbeddable(fallbackVisual(fallbackTitle).src);
		if (jpeg && isPptxSafeRaster(jpeg)) return jpeg;
	} catch {}
	return paintCard(fallbackTitle);
}
/** pptxgenjs wants `image/jpeg;base64,...` without the `data:` prefix. */
function pptxData(dataUrl) {
	if (!dataUrl) return "";
	const raw = dataUrl.replace(/^data:/i, "");
	if (/^image\/(png|jpe?g|webp|gif);base64,/i.test(raw)) return raw.replace(/^image\/jpg;/i, "image/jpeg;");
	if (raw.includes("base64,")) {
		const payload = raw.split("base64,").pop() || "";
		if (payload.length > 80) return `image/jpeg;base64,${payload}`;
	}
	return "";
}
async function proxyAll(srcs) {
	const unique = [...new Set(srcs.filter((s) => /^https?:/i.test(s)))];
	const map = {};
	for (let i = 0; i < unique.length; i += 10) {
		const chunk = unique.slice(i, i + 10);
		try {
			const proxied = await proxyImages({ data: { srcs: chunk } });
			if (proxied.ok) Object.assign(map, proxied.map);
		} catch {}
	}
	return map;
}
async function exportPptx(deck) {
	const PptxGenJS = (await import("../_libs/pptxgenjs.mjs").then((n) => n.t)).default;
	const pptx = new PptxGenJS();
	pptx.author = "JUW-MicroSlides";
	pptx.title = deck.title;
	pptx.subject = `${deck.discipline} · ${deck.topic}`;
	pptx.layout = "LAYOUT_WIDE";
	const meta = lectureMeta(deck);
	const proxyMap = await proxyAll([
		...deck.slides.flatMap((s) => s.media.map((m) => mediaDisplaySrc(m.src))),
		absoluteSrc(JUW.crest),
		absoluteSrc(JUW.microscope)
	]);
	const crest = await asPptxImage(JUW.crest, proxyMap[absoluteSrc(JUW.crest)] ?? null, "JUW crest");
	const scope = await asPptxImage(JUW.microscope, proxyMap[absoluteSrc(JUW.microscope)] ?? null, "Department of Microbiology");
	const figureCache = /* @__PURE__ */ new Map();
	async function figureData(src, title) {
		const key = mediaDisplaySrc(src);
		const hit = figureCache.get(key);
		if (hit) return hit;
		const data = await asPptxImage(src, proxyMap[key] ?? proxyMap[src] ?? proxyMap[absoluteSrc(key)] ?? null, title);
		figureCache.set(key, data);
		return data;
	}
	let imgSeq = 0;
	const addJpeg = (s, dataUrl, box) => {
		const payload = pptxData(dataUrl);
		if (!payload) return false;
		imgSeq += 1;
		s.addImage({
			data: payload,
			path: `preencoded-${imgSeq}.jpeg`,
			x: box.x,
			y: box.y,
			w: box.w,
			h: box.h
		});
		return true;
	};
	for (let idx = 0; idx < deck.slides.length; idx++) {
		const slide = deck.slides[idx];
		const tokens = themeOf(slide.theme);
		const s = pptx.addSlide();
		s.background = { color: tokens.band.replace("#", "") };
		s.addShape(pptx.ShapeType.rect, {
			x: .12,
			y: .12,
			w: 13.09,
			h: 7.26,
			fill: { color: tokens.slide.replace("#", "") },
			line: {
				color: tokens.frame.replace("#", ""),
				pt: 2.25
			}
		});
		const ink = tokens.ink.replace("#", "");
		const navy = tokens.navy.replace("#", "");
		const muted = tokens.muted.replace("#", "");
		const accent = tokens.accent.replace("#", "");
		addJpeg(s, crest, {
			x: .28,
			y: .24,
			w: 1.18,
			h: 1.18
		});
		if (slide.layout === "title") addJpeg(s, scope, {
			x: 10.35,
			y: .18,
			w: 2.7,
			h: 1.7
		});
		else {
			s.addShape(pptx.ShapeType.rect, {
				x: .12,
				y: .12,
				w: .08,
				h: 7.26,
				fill: { color: accent }
			});
			s.addText(tokens.label.toUpperCase(), {
				x: 10.4,
				y: .42,
				w: 2.5,
				h: .28,
				fontSize: 9,
				fontFace: "Calibri",
				color: muted,
				align: "right",
				margin: 0
			});
		}
		if (slide.layout !== "title") s.addText(`${String(idx + 1).padStart(2, "0")} / ${String(deck.slides.length).padStart(2, "0")}`, {
			x: .35,
			y: 7,
			w: 1.6,
			h: .22,
			fontSize: 9,
			fontFace: "Calibri",
			color: muted,
			margin: 0
		});
		const fig = slide.layout === "title" ? void 0 : slide.media[0];
		const data = fig ? await figureData(fig.src, fig.title || slide.title) : "";
		const hasFig = Boolean(fig && pptxData(data));
		if (slide.layout === "title") {
			s.addText(slide.title, {
				x: .8,
				y: 2.35,
				w: 11.7,
				h: 1.6,
				fontSize: 34,
				fontFace: "Georgia",
				color: ink,
				bold: true,
				align: "center",
				margin: 0
			});
			s.addShape(pptx.ShapeType.rect, {
				x: 10.55,
				y: 4.55,
				w: .7,
				h: .06,
				fill: { color: accent }
			});
			s.addText([
				meta.course,
				meta.courseCode,
				`PREPARED BY: ${meta.preparedBy}`,
				meta.department
			].join("\n"), {
				x: 7.4,
				y: 4.75,
				w: 5.2,
				h: 1.5,
				fontSize: 12,
				fontFace: "Calibri",
				color: ink,
				align: "right",
				bold: true,
				margin: 0
			});
		} else {
			s.addText(slide.title, {
				x: .5,
				y: 1.4,
				w: 12.3,
				h: .6,
				fontSize: 22,
				fontFace: "Georgia",
				color: navy,
				bold: true,
				margin: 0
			});
			if (slide.layout === "two-column") {
				s.addText(slide.leftBullets.map((b) => ({
					text: b,
					options: {
						bullet: true,
						breakLine: true
					}
				})), {
					x: .5,
					y: 2.15,
					w: 6,
					h: hasFig ? 3.05 : 4.4,
					fontSize: 15,
					fontFace: "Calibri",
					color: ink,
					valign: "top"
				});
				s.addText(slide.rightBullets.map((b) => ({
					text: b,
					options: {
						bullet: true,
						breakLine: true
					}
				})), {
					x: 6.8,
					y: 2.15,
					w: 5.9,
					h: hasFig ? 3.05 : 4.4,
					fontSize: 15,
					fontFace: "Calibri",
					color: ink,
					valign: "top"
				});
			} else if (slide.bullets.length) s.addText(slide.bullets.map((b) => ({
				text: b,
				options: {
					bullet: true,
					breakLine: true
				}
			})), {
				x: .5,
				y: 2.15,
				w: hasFig && slide.layout !== "full-image" ? 7.4 : 12.3,
				h: 4.4,
				fontSize: 16,
				fontFace: "Calibri",
				color: ink,
				valign: "top"
			});
		}
		if (slide.citations.length && slide.layout !== "title") s.addText(slide.citations.slice(0, 2).map((c) => formatCitation(c, deck.citationStyle)).join("  ·  "), {
			x: 2.1,
			y: 6.95,
			w: 10.6,
			h: .28,
			fontSize: 9,
			fontFace: "Calibri",
			color: muted,
			margin: 0
		});
		if (hasFig) {
			const box = slide.layout === "full-image" ? {
				x: 7.15,
				y: 2.15,
				w: 5.6,
				h: 4.35
			} : slide.layout === "two-column" ? {
				x: .5,
				y: 5.25,
				w: 4.4,
				h: 1.55
			} : {
				x: 8.15,
				y: 2.15,
				w: 4.7,
				h: 4.15
			};
			addJpeg(s, data, box);
			s.addText(`${fig?.title ?? slide.title}  ·  ${fig?.credit ?? "JUW-MicroSlides"}  ·  ${fig?.license ?? "CC0"}`, {
				x: box.x,
				y: box.y + box.h + .02,
				w: box.w,
				h: .22,
				fontSize: 8,
				fontFace: "Calibri",
				color: muted,
				margin: 0
			});
		}
	}
	await pptx.writeFile({ fileName: `${slug(deck.title)}.pptx` });
}
function slug(s) {
	return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || "juw-deck";
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-[opacity,transform,background-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-fg text-bg hover:opacity-90",
			accent: "bg-accent text-accent-fg hover:opacity-90",
			secondary: "bg-elevated text-fg border border-border hover:bg-card",
			ghost: "text-muted hover:text-fg hover:bg-elevated",
			danger: "bg-danger/15 text-danger hover:bg-danger/25"
		},
		size: {
			default: "h-10 px-3.5",
			sm: "h-8 px-2.5 text-xs rounded-xs",
			lg: "h-11 px-4",
			icon: "size-10",
			"icon-sm": "size-8 rounded-xs"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
var Input = import_react.forwardRef(({ className, type, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
	type,
	ref,
	className: cn("flex h-10 w-full rounded-sm border border-border bg-elevated px-3 text-sm text-fg", "placeholder:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70", "disabled:opacity-40", className),
	...props
}));
Input.displayName = "Input";
function Label({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root, {
		className: cn("text-xs font-medium uppercase tracking-[0.08em] text-muted", className),
		...props
	});
}
var Textarea = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
	ref,
	className: cn("flex min-h-24 w-full rounded-sm border border-border bg-elevated px-3 py-2 text-sm text-fg", "placeholder:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70", className),
	...props
}));
Textarea.displayName = "Textarea";
var selectClass = "h-10 w-full rounded-sm border border-border bg-elevated px-2 text-sm text-fg";
var SLIDE_PRESETS = [
	6,
	12,
	18,
	24,
	36,
	48,
	72,
	96,
	120,
	180,
	240,
	400
];
var TOPIC_CHIPS = [
	"MRSA virulence",
	"Malaria",
	"qPCR 16S rRNA",
	"Biofilms",
	"Tuberculosis",
	"Candida albicans",
	"Influenza",
	"Enzyme Immobilization"
];
function withTimeout(promise, ms) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(/* @__PURE__ */ new Error("timeout")), ms);
		promise.then((value) => {
			clearTimeout(timer);
			resolve(value);
		}, (err) => {
			clearTimeout(timer);
			reject(err);
		});
	});
}
function GenerateForm({ compact = false }) {
	const generate = useDeckStore((s) => s.generate);
	const draft = useDeckStore((s) => s.generateDraft);
	const patchDraft = useDeckStore((s) => s.patchGenerateDraft);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [lockDiscipline, setLockDiscipline] = (0, import_react.useState)(false);
	function setTopic(topic) {
		if (!lockDiscipline) {
			const hinted = suggestDiscipline(topic);
			if (hinted) patchDraft({ discipline: hinted });
		}
		useDeckStore.getState().renameTopic(topic);
	}
	async function onGenerate(topicOverride) {
		const live = useDeckStore.getState();
		const draftNow = live.generateDraft;
		const topic = (topicOverride ?? draftNow.topic).trim();
		if (!topic) {
			toast.message("Type a lecture topic first — any microbiology subject, not only enzymes.");
			return;
		}
		const discipline = !lockDiscipline && (topicOverride || suggestDiscipline(topic)) ? suggestDiscipline(topic) || draftNow.discipline : draftNow.discipline;
		const landing = live.deck();
		const input = {
			topic,
			discipline,
			count: Math.min(400, Math.max(1, Math.round(draftNow.count) || 12)),
			level: draftNow.level,
			notes: draftNow.notes,
			mode: draftNow.mode,
			course: draftNow.course || landing?.course || JUW.course,
			courseCode: draftNow.courseCode || landing?.courseCode || JUW.courseCode,
			preparedBy: draftNow.preparedBy || landing?.preparedBy || JUW.preparedBy,
			department: landing?.department || JUW.department
		};
		patchDraft({
			topic,
			discipline,
			count: input.count
		});
		setBusy(true);
		try {
			const local = generateLocalDeck(input);
			if (local.slides[0]) local.slides[0] = {
				...local.slides[0],
				layout: "title",
				theme: "classic",
				title: topic,
				subtitle: "",
				bullets: [],
				leftBullets: [],
				rightBullets: [],
				media: []
			};
			generate(input, local);
			toast.success(`Title slide is “${topic}”. Same JUW landing layout. ${local.slides.length} slides across the microbiology themes.`);
			try {
				const media = await withTimeout(collectDeckMedia({ data: {
					topic: input.topic,
					discipline: input.discipline,
					slides: local.slides.map((s) => ({
						id: s.id,
						title: s.title,
						text: [
							...s.bullets,
							...s.leftBullets,
							...s.rightBullets,
							s.notes
						].join(" ")
					}))
				} }), 8e3);
				const current = useDeckStore.getState().deck();
				if (!current || current.topic !== topic) return;
				const upgraded = applyCollectedMedia(current, media.ok ? media : null);
				if (upgraded.slides[0]?.layout === "title") upgraded.slides[0] = {
					...upgraded.slides[0],
					title: topic,
					subtitle: "",
					bullets: [],
					media: [],
					theme: "classic"
				};
				useDeckStore.getState().replaceActive(upgraded);
			} catch {}
		} catch {
			try {
				generate(input, generateLocalDeck(input));
				toast.message("Built a catalog-illustrated deck for this topic.");
			} catch {
				toast.message("Could not build that deck. Try a shorter topic.");
			}
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: cn("grid gap-3", compact && "gap-2"),
		onSubmit: (e) => {
			e.preventDefault();
			onGenerate();
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("grid gap-3", compact ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(10rem,1fr)_minmax(0,1fr)_auto]" : ""),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: compact ? "gen-topic" : "topic",
								children: "Topic"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: compact ? "gen-topic" : "topic",
								value: draft.topic,
								onChange: (e) => setTopic(e.target.value),
								placeholder: "e.g. MRSA virulence, malaria, PCR",
								autoComplete: "off"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-1",
								children: TOPIC_CHIPS.map((chip) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => void onGenerate(chip),
									disabled: busy,
									className: cn("h-7 rounded-sm border px-2 text-[11px]", draft.topic === chip ? "border-accent bg-accent/15 text-fg" : "border-border text-muted hover:border-accent"),
									children: chip
								}, chip))
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: compact ? "gen-disc" : "disc",
							children: "Discipline"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							id: compact ? "gen-disc" : "disc",
							value: draft.discipline,
							onChange: (e) => {
								setLockDiscipline(true);
								patchDraft({ discipline: e.target.value });
							},
							className: selectClass,
							children: DISCIPLINES.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: d.name,
								children: d.name
							}, d.name))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
								htmlFor: compact ? "gen-count" : "count",
								children: [
									"Slides (1–",
									400,
									")"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: compact ? "gen-count" : "count",
								type: "number",
								min: 1,
								max: 400,
								value: draft.count,
								onChange: (e) => patchDraft({ count: Number(e.target.value) })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "range",
								min: 1,
								max: 400,
								value: Math.min(400, Math.max(1, draft.count || 1)),
								onChange: (e) => patchDraft({ count: Number(e.target.value) }),
								className: "w-full accent-[var(--accent)]",
								"aria-label": "Slide count"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: compact ? "gen-level" : "level",
							children: "Level"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							id: compact ? "gen-level" : "level",
							value: draft.level,
							onChange: (e) => patchDraft({ level: e.target.value }),
							className: selectClass,
							children: LEVELS.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: l,
								children: l
							}, l))
						})]
					}),
					compact ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-end",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							disabled: busy,
							variant: "accent",
							className: "w-full",
							children: busy ? "Writing…" : "Generate deck"
						})
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-1.5",
				children: SLIDE_PRESETS.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => patchDraft({ count: n }),
					className: cn("h-8 rounded-sm border px-2 text-xs tabular-nums", draft.count === n ? "border-accent bg-accent/15 text-fg" : "border-border text-muted hover:border-accent"),
					children: n
				}, n))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted",
					children: "The landing title slide stays the official JUW frame. A new topic changes only that title. Generate rebuilds the lecture around it. Nine microbiology themes rotate on the content slides. The department microscope is on the introduction only."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap gap-1",
					children: SLIDE_THEMES.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex h-6 items-center gap-1.5 rounded-sm border border-border px-1.5 text-[10px] uppercase tracking-wide text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
							className: "inline-block size-2.5 rounded-full",
							style: { background: THEME_TOKENS[id].frame }
						}), THEME_TOKENS[id].label]
					}, id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("grid gap-3", compact ? "sm:grid-cols-3" : "gap-3"),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: compact ? "gen-course" : "course",
							children: "Course"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: compact ? "gen-course" : "course",
							value: draft.course,
							onChange: (e) => patchDraft({ course: e.target.value }),
							placeholder: JUW.course
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: compact ? "gen-code" : "code",
							children: "Course code"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: compact ? "gen-code" : "code",
							value: draft.courseCode,
							onChange: (e) => patchDraft({ courseCode: e.target.value }),
							placeholder: JUW.courseCode
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: compact ? "gen-prep" : "prep",
							children: "Prepared by"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: compact ? "gen-prep" : "prep",
							value: draft.preparedBy,
							onChange: (e) => patchDraft({ preparedBy: e.target.value }),
							placeholder: JUW.preparedBy
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					htmlFor: compact ? "gen-notes" : "notes",
					children: "Optional abstract or lecture notes"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					id: compact ? "gen-notes" : "notes",
					value: draft.notes,
					onChange: (e) => patchDraft({ notes: e.target.value }),
					placeholder: "Paste a paper abstract or your notes. The generator will structure the lecture arc.",
					className: compact ? "min-h-16" : ""
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
				className: "flex flex-wrap gap-4 text-sm text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
						className: "sr-only",
						children: "Generation mode"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex min-h-11 items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "radio",
							name: "gen-mode",
							checked: draft.mode === "manual",
							onChange: () => patchDraft({ mode: "manual" })
						}), "Manual — knowledge base, no key"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex min-h-11 items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "radio",
							name: "gen-mode",
							checked: draft.mode === "ai",
							onChange: () => patchDraft({ mode: "ai" })
						}), "AI lecture writer"]
					})
				]
			}),
			!compact ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				disabled: busy,
				variant: "accent",
				children: busy ? "Writing slides…" : "Generate deck"
			}) : null
		]
	});
}
var Dialog = Dialog$1;
function DialogContent({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-50 bg-navy/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
		className: cn("fixed left-1/2 top-1/2 z-50 w-[min(560px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2", "rounded-lg border border-border bg-surface p-5 text-fg shadow-panel", "data-[state=open]:animate-in data-[state=closed]:animate-out", className),
		...props,
		children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
			className: "absolute right-3 top-3 rounded-xs p-2 text-muted hover:text-fg",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "sr-only",
				children: "Close"
			})]
		})]
	})] });
}
function DialogHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("mb-4 space-y-1 pr-8", className),
		...props
	});
}
function DialogTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle$1, {
		className: cn("font-serif text-xl text-fg", className),
		...props
	});
}
function DialogDescription({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription$1, {
		className: cn("text-sm text-muted", className),
		...props
	});
}
function GenerateDialog() {
	const open = useDeckStore((s) => s.generateOpen);
	const setOpen = useDeckStore((s) => s.setGenerateOpen);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Generate a scientific deck" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Sixteen microbiology disciplines, citation-ready slides, open scientific media." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GenerateForm, {})] })
	});
}
function GeneratePanel() {
	const open = useDeckStore((s) => s.generatorOpen);
	const setOpen = useDeckStore((s) => s.setGeneratorOpen);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "shrink-0 rounded-md border border-border bg-surface",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: () => setOpen(!open),
			className: "flex min-h-11 w-full items-center justify-between px-3 py-2 text-left",
			"aria-expanded": open,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "block font-serif text-base text-fg",
				children: "Generate a scientific deck"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "block text-xs text-muted",
				children: "Official JUW title slide — only the topic name changes. Ten microbiology themes. Microscope on the introduction only."
			})] }), open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "size-4 text-muted" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-4 text-muted" })]
		}), open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "border-t border-border px-3 pb-3 pt-3",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GenerateForm, { compact: true })
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex justify-end px-3 pb-2",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "sm",
				variant: "ghost",
				onClick: () => setOpen(true),
				children: "Open generator"
			})
		})]
	});
}
createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("d6b2126f54fc21bfba383e40403e518078aaacac2a76c91dbca9f74cef2bab6a"));
var askCopilot = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("d22813eaee0ca85f09d47fc0658f45b92956f08943136c8243ec14b84014df71"));
var searchPubmed = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("5fb0bb9f6714c06fa0b819dc807bd7efd7d6d5aab900a93432f0107c0e8ea68d"));
var searchOpenAlex = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("4ae808d303a482e6635803e75140947c7a3f86249a50710639f25c7d9a49e273"));
function asAuthors(value) {
	if (Array.isArray(value)) return value.map((item) => {
		if (typeof item === "string") return item;
		if (item && typeof item === "object" && "name" in item) return String(item.name);
		return "";
	}).filter(Boolean).slice(0, 4).join(", ");
	if (typeof value === "string") return value;
	return "Unknown";
}
function fromRecord(raw) {
	const title = String(raw.title ?? raw.Title ?? raw.display_name ?? raw.name ?? "").trim();
	if (!title) return null;
	const year = String(raw.year ?? raw.Year ?? raw.publication_year ?? raw.date ?? "").slice(0, 4);
	const journal = String(raw.journal ?? raw.Journal ?? raw.venue ?? raw.source ?? raw.publication ?? "").trim();
	const doiRaw = String(raw.doi ?? raw.DOI ?? "").replace(/^https?:\/\/doi.org\//i, "");
	const authors = asAuthors(raw.authors ?? raw.Authors ?? raw.author ?? raw.Author);
	return {
		id: uid("ev"),
		authors: authors || "Unknown",
		title: title.replace(/\.$/, ""),
		journal: journal || "Journal",
		year: /\d{4}/.test(year) ? year : "n.d.",
		doi: doiRaw || void 0,
		pmid: raw.pmid ? String(raw.pmid) : void 0
	};
}
function parseJson(raw) {
	const json = JSON.parse(raw);
	const list = Array.isArray(json) ? json : json && typeof json === "object" ? json.papers ?? json.results ?? json.items ?? json.data ?? [] : [];
	if (!Array.isArray(list)) return [];
	return list.filter((item) => Boolean(item) && typeof item === "object").map(fromRecord).filter((c) => Boolean(c));
}
function parseCsv(raw) {
	const lines = raw.split(/\r?\n/).filter((line) => line.trim());
	if (lines.length < 2) return [];
	const split = (line) => {
		const cells = [];
		let cur = "";
		let quoted = false;
		for (let i = 0; i < line.length; i++) {
			const ch = line[i];
			if (ch === "\"") {
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
	const col = (names) => header.findIndex((h) => names.some((n) => h.includes(n)));
	const iTitle = col(["title", "paper"]);
	const iAuthors = col(["author"]);
	const iYear = col(["year", "date"]);
	const iJournal = col([
		"journal",
		"venue",
		"source",
		"publication"
	]);
	const iDoi = col(["doi"]);
	if (iTitle < 0) return [];
	const out = [];
	for (const line of lines.slice(1)) {
		const cells = split(line);
		const c = fromRecord({
			title: cells[iTitle],
			authors: iAuthors >= 0 ? cells[iAuthors] : "Unknown",
			year: iYear >= 0 ? cells[iYear] : "",
			journal: iJournal >= 0 ? cells[iJournal] : "",
			doi: iDoi >= 0 ? cells[iDoi] : ""
		});
		if (c) out.push(c);
	}
	return out;
}
function parseBibtex(raw) {
	const chunks = raw.split(/@\w+\s*\{/);
	const out = [];
	for (const chunk of chunks.slice(1)) {
		const field = (name) => {
			return new RegExp(`${name}\\s*=\\s*[{"]([^}"]+)[}"]`, "i").exec(chunk)?.[1]?.trim() ?? "";
		};
		const c = fromRecord({
			title: field("title"),
			authors: field("author").replace(/\s+and\s+/gi, ", "),
			year: field("year"),
			journal: field("journal") || field("booktitle") || field("venue"),
			doi: field("doi")
		});
		if (c) out.push(c);
	}
	return out;
}
/** Parse pasted Elicit / Zotero / OpenAlex exports (JSON, CSV, or BibTeX). */
function parseEvidencePaste(raw) {
	const text = raw.trim();
	if (!text) return [];
	if (text.startsWith("{") || text.startsWith("[")) try {
		const jsonHits = parseJson(text);
		if (jsonHits.length) return jsonHits;
	} catch {}
	if (/@\w+\s*\{/.test(text)) {
		const bib = parseBibtex(text);
		if (bib.length) return bib;
	}
	return parseCsv(text);
}
function ScrollArea({ className, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Root$1, {
		className: cn("overflow-hidden", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Viewport, {
			className: "h-full w-full",
			children
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scrollbar, {
			orientation: "vertical",
			className: "flex w-1.5 touch-none select-none bg-transparent p-px",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thumb, { className: "relative flex-1 rounded-full bg-border" })
		})]
	});
}
var TABS = [
	{
		id: "edit",
		label: "Edit"
	},
	{
		id: "media",
		label: "Media"
	},
	{
		id: "cite",
		label: "PubMed"
	},
	{
		id: "evidence",
		label: "Evidence"
	},
	{
		id: "audit",
		label: "Audit"
	},
	{
		id: "copilot",
		label: "Copilot"
	}
];
function InspectorPanel() {
	const tab = useDeckStore((s) => s.inspectorTab);
	const setTab = useDeckStore((s) => s.setTab);
	const inspectorOpen = useDeckStore((s) => s.inspectorOpen);
	const toggleInspector = useDeckStore((s) => s.toggleInspector);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: `flex w-[min(100%,320px)] shrink-0 flex-col border-l border-border bg-surface max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:shadow-panel ${inspectorOpen ? "max-lg:flex" : "max-lg:hidden"} lg:flex`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between border-b border-border px-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex min-w-0 flex-1 overflow-x-auto",
				children: TABS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setTab(t.id),
					className: `h-11 shrink-0 px-2.5 text-xs uppercase tracking-wider ${tab === t.id ? "border-b-2 border-accent text-fg" : "text-muted"}`,
					children: t.label
				}, t.id))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				size: "sm",
				className: "lg:hidden",
				onClick: toggleInspector,
				children: "Close"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollArea, {
			className: "min-h-0 flex-1",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4 p-3",
				children: [
					tab === "edit" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditTab, {}),
					tab === "media" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaTab, {}),
					tab === "cite" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CiteTab, {}),
					tab === "evidence" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EvidenceTab, {}),
					tab === "audit" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuditTab, {}),
					tab === "copilot" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopilotTab, {})
				]
			})
		})]
	});
}
function EditTab() {
	const deck = useDeckStore((s) => s.deck());
	const slide = useDeckStore((s) => s.slide());
	const index = useDeckStore((s) => s.selectedIndex);
	const patchSlide = useDeckStore((s) => s.patchSlide);
	const patchDeck = useDeckStore((s) => s.patchDeck);
	const setLayout = useDeckStore((s) => s.setLayout);
	if (!slide || !deck) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Select a slide." });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs text-muted",
			children: "Every field is live — you can also click the slide canvas and type."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Layout",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				value: slide.layout,
				onChange: (e) => setLayout(e.target.value),
				className: "h-10 w-full rounded-sm border border-border bg-elevated px-2 text-sm",
				children: LAYOUTS.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: l,
					children: l
				}, l))
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Field, {
			label: "Theme",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				value: slide.theme ?? "classic",
				onChange: (e) => patchSlide(index, { theme: e.target.value }),
				className: "h-10 w-full rounded-sm border border-border bg-elevated px-2 text-sm",
				children: SLIDE_THEMES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: t,
					children: THEME_TOKENS[t].label
				}, t))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-[11px] text-muted",
				children: THEME_TOKENS[slide.theme ?? "classic"].blurb
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Title",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: slide.title,
				onChange: (e) => patchSlide(index, { title: e.target.value })
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Subtitle",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: slide.subtitle,
				onChange: (e) => patchSlide(index, { subtitle: e.target.value })
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: slide.layout === "two-column" ? "Columns (use | to split)" : "Bullets (one per line)",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
				value: slide.layout === "two-column" ? `${slide.leftBullets.join("\n")}\n|\n${slide.rightBullets.join("\n")}` : slide.bullets.join("\n"),
				onChange: (e) => {
					const raw = e.target.value;
					if (slide.layout === "two-column") {
						const [left, ...rest] = raw.split(/\n\|\n|\n\|/);
						patchSlide(index, {
							leftBullets: (left || "").split("\n").map((x) => x.trim()).filter(Boolean),
							rightBullets: rest.join("\n").split("\n").map((x) => x.trim()).filter(Boolean)
						});
					} else patchSlide(index, { bullets: raw.split("\n").filter((x) => x.trim().length > 0) });
				},
				className: "min-h-40"
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Speaker notes",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
				value: slide.notes,
				onChange: (e) => patchSlide(index, { notes: e.target.value }),
				placeholder: "What will you explain when presenting this slide?"
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Course (title slide)",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: deck.course ?? "",
				onChange: (e) => patchDeck({ course: e.target.value })
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Course code",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: deck.courseCode ?? "",
				onChange: (e) => patchDeck({ courseCode: e.target.value })
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Prepared by",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: deck.preparedBy ?? "",
				onChange: (e) => patchDeck({ preparedBy: e.target.value })
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Department",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: deck.department ?? "",
				onChange: (e) => patchDeck({ department: e.target.value })
			})
		})
	] });
}
function MediaTab() {
	const deck = useDeckStore((s) => s.deck());
	const slide = useDeckStore((s) => s.slide());
	const attach = useDeckStore((s) => s.attachMedia);
	const remove = useDeckStore((s) => s.removeMedia);
	const [q, setQ] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [live, setLive] = (0, import_react.useState)([]);
	const [credit, setCredit] = (0, import_react.useState)({
		url: "",
		creator: "",
		source: "",
		license: "CC BY 4.0"
	});
	const used = (0, import_react.useMemo)(() => {
		const keys = /* @__PURE__ */ new Set();
		for (const s of deck?.slides ?? []) for (const m of s.media) {
			keys.add(m.id);
			keys.add(mediaKey(m.src));
		}
		return keys;
	}, [deck]);
	const catalog = (0, import_react.useMemo)(() => {
		if (q.trim()) return searchMedia(q, 16, used);
		if (slide) return suggestMediaForText(`${slide.title} ${slide.bullets.join(" ")}`, 12, used);
		return searchMedia("", 12, used);
	}, [
		q,
		slide,
		used
	]);
	async function searchLive(silent = false) {
		const query = q.trim() || `${slide?.title ?? ""} ${deck?.topic ?? "microbiology"}`;
		setBusy(true);
		try {
			const res = await searchOpenMedia({ data: { query } });
			if (!res.ok) {
				if (!silent) toast.message(res.error);
				setLive([]);
				return;
			}
			setLive(res.items);
			if (!res.items.length && !silent) toast.message("No open-licence hits. Try a species, stain, or method name.");
		} catch {
			if (!silent) toast.message("Open archives are unreachable right now.");
		} finally {
			setBusy(false);
		}
	}
	(0, import_react.useEffect)(() => {
		searchLive(true);
	}, [slide?.id]);
	function tryAttach(item) {
		const key = mediaKey(item.src);
		if (used.has(item.id) || used.has(key)) {
			toast.message("That file is already on another slide in this deck.");
			return;
		}
		attach(item);
	}
	if (!slide || !deck) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Select a slide." });
	const pool = (deck.mediaPool ?? []).filter((m) => !used.has(m.id) && !used.has(mediaKey(m.src)));
	const liveUnused = live.filter((m) => !used.has(m.id) && !used.has(mediaKey(m.src)));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs text-muted",
			children: "Each slide keeps one unique figure — no repeats in this deck. Search Wikimedia Commons, Openverse, Wellcome, iNaturalist, NASA, Library of Congress, GBIF, Wikipedia, Cleveland Museum, The Met, Art Institute of Chicago, and Internet Archive. Unused generate hits stay in the pool so you can swap without losing them."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Search open archives",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: q,
					onChange: (e) => setQ(e.target.value),
					onKeyDown: (e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							searchLive();
						}
					},
					placeholder: "Gram stain, enzyme, phage diagram…"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "accent",
					onClick: () => void searchLive(),
					disabled: busy,
					children: busy ? "…" : "Go"
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			size: "sm",
			variant: "secondary",
			className: "w-full",
			onClick: () => {
				setQ(`${slide.title} ${slide.bullets[0] ?? deck.topic}`);
				searchLive();
			},
			children: "Search this slide’s topic"
		}),
		slide.media.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "On this slide" }), slide.media.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 rounded-sm border border-border bg-elevated p-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: mediaDisplaySrc(m.src),
						alt: "",
						className: "size-12 rounded-xs object-cover",
						referrerPolicy: "no-referrer",
						onError: (e) => {
							e.currentTarget.onerror = null;
							e.currentTarget.src = fallbackVisual(m.title).src;
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block truncate text-sm text-fg",
							children: m.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "block text-xs text-muted",
							children: [
								m.kind,
								" · ",
								m.source,
								" · ",
								m.license
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "sm",
						onClick: () => remove(m.id),
						children: "Swap"
					})
				]
			}, m.id))]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaGrid, {
			title: "Collected for this deck",
			items: pool,
			onPick: tryAttach
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaGrid, {
			title: "Live open sources",
			items: liveUnused,
			onPick: tryAttach
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaGrid, {
			title: "Studio catalog",
			items: catalog,
			onPick: tryAttach
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-2 rounded-sm border border-border p-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Your own media" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: credit.url,
					onChange: (e) => setCredit({
						...credit,
						url: e.target.value
					}),
					placeholder: "Image URL"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: credit.creator,
					onChange: (e) => setCredit({
						...credit,
						creator: e.target.value
					}),
					placeholder: "Creator / organisation"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: credit.source,
					onChange: (e) => setCredit({
						...credit,
						source: e.target.value
					}),
					placeholder: "Source (Wikimedia, lab, paper…)"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: credit.license,
					onChange: (e) => setCredit({
						...credit,
						license: e.target.value
					}),
					placeholder: "License"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "secondary",
					className: "w-full",
					onClick: () => {
						if (!credit.url.trim()) {
							toast.message("Add an image URL first.");
							return;
						}
						tryAttach({
							id: uid("media"),
							kind: "photo",
							title: credit.creator || "Instructor media",
							src: credit.url.trim(),
							credit: credit.creator || "Instructor",
							source: credit.source || "Own media",
							license: credit.license || "All rights reserved",
							keywords: []
						});
						setCredit({
							url: "",
							creator: "",
							source: "",
							license: "CC BY 4.0"
						});
						toast.success("Media attached with credit.");
					},
					children: "Save credit and attach"
				})
			]
		})
	] });
}
function MediaGrid({ title, items, onPick }) {
	if (!items.length) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: title }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-2",
			children: items.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => onPick(m),
				className: "flex gap-2 rounded-sm border border-border bg-elevated p-2 text-left hover:border-accent",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: mediaDisplaySrc(m.src),
					alt: "",
					className: "size-14 rounded-xs object-cover",
					referrerPolicy: "no-referrer",
					onError: (e) => {
						e.currentTarget.onerror = null;
						e.currentTarget.src = fallbackVisual(m.title).src;
					}
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block truncate text-sm text-fg",
						children: m.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "block text-xs text-muted",
						children: [
							m.kind,
							" · ",
							m.source,
							" · ",
							m.license
						]
					})]
				})]
			}, m.id))
		})]
	});
}
function CiteTab() {
	const slide = useDeckStore((s) => s.slide());
	const attach = useDeckStore((s) => s.attachCitation);
	const remove = useDeckStore((s) => s.removeCitation);
	const style = useDeckStore((s) => s.citationStyle);
	const [q, setQ] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [hits, setHits] = (0, import_react.useState)(null);
	async function run() {
		setBusy(true);
		try {
			const res = await searchPubmed({ data: { query: q || slide?.title || "microbiology" } });
			setHits(res);
			if (!res.ok) toast.message(res.error);
		} catch {
			toast.message("PubMed is unreachable right now.");
		} finally {
			setBusy(false);
		}
	}
	if (!slide) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Select a slide." });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Search PubMed",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: q,
					onChange: (e) => setQ(e.target.value),
					placeholder: slide.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "secondary",
					onClick: run,
					disabled: busy,
					children: busy ? "…" : "Go"
				})]
			})
		}),
		hits && hits.ok && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-2",
			children: [hits.citations.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted",
				children: "No hits. Try a species or toxin name."
			}), hits.citations.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => attach(c),
				className: "w-full rounded-sm border border-border bg-elevated p-2 text-left text-xs leading-snug hover:border-accent",
				children: formatCitation(c, style)
			}, c.id))]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Attached" }),
				slide.citations.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted",
					children: "None yet — audit will flag this slide."
				}),
				slide.citations.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-sm border border-border p-2 text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-fg",
						children: formatCitation(c, style)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "sm",
						className: "mt-1",
						onClick: () => remove(c.id),
						children: "Detach"
					})]
				}, c.id))
			]
		})
	] });
}
function EvidenceTab() {
	const slide = useDeckStore((s) => s.slide());
	const attach = useDeckStore((s) => s.attachCitation);
	const style = useDeckStore((s) => s.citationStyle);
	const [q, setQ] = (0, import_react.useState)("");
	const [paste, setPaste] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [hits, setHits] = (0, import_react.useState)([]);
	const [picked, setPicked] = (0, import_react.useState)({});
	async function search() {
		setBusy(true);
		try {
			const res = await searchOpenAlex({ data: { query: q || slide?.title || "microbiology" } });
			if (!res.ok) {
				toast.message(res.error);
				return;
			}
			setHits(res.citations);
			setPicked({});
			if (!res.citations.length) toast.message("No OpenAlex hits. Try a more specific query.");
		} catch {
			toast.message("OpenAlex is unreachable right now.");
		} finally {
			setBusy(false);
		}
	}
	function importPaste() {
		const parsed = parseEvidencePaste(paste);
		if (!parsed.length) {
			toast.message("Could not parse that paste. Use Elicit CSV, JSON, or BibTeX.");
			return;
		}
		setHits(parsed);
		setPicked(Object.fromEntries(parsed.map((c) => [c.id, true])));
		toast.success(`Imported ${parsed.length} records.`);
	}
	function attachSelected() {
		const chosen = hits.filter((c) => picked[c.id]);
		if (!chosen.length) {
			toast.message("Select at least one record.");
			return;
		}
		chosen.forEach(attach);
		toast.success(`Attached ${chosen.length} to this slide.`);
	}
	if (!slide) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Select a slide." });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs text-muted",
			children: "Zero-cost evidence: OpenAlex search, or import Elicit CSV / JSON / BibTeX."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "OpenAlex",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: q,
					onChange: (e) => setQ(e.target.value),
					placeholder: "bacterial chromosome organisation"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "secondary",
					onClick: search,
					disabled: busy,
					children: busy ? "…" : "Search"
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "Import Elicit",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
				value: paste,
				onChange: (e) => setPaste(e.target.value),
				placeholder: "Paste Elicit CSV, JSON or BibTeX here.",
				className: "min-h-24"
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "sm",
				variant: "secondary",
				onClick: importPaste,
				children: "Import Elicit"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "sm",
				variant: "accent",
				onClick: attachSelected,
				children: "Attach selected"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-2",
			children: hits.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex gap-2 rounded-sm border border-border bg-elevated p-2 text-xs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					className: "mt-0.5",
					checked: Boolean(picked[c.id]),
					onChange: (e) => setPicked((p) => ({
						...p,
						[c.id]: e.target.checked
					}))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "min-w-0 leading-snug text-fg",
					children: formatCitation(c, style)
				})]
			}, c.id))
		}),
		slide.citations.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Attached evidence" }), slide.citations.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs leading-snug text-muted",
				children: formatCitation(c, style)
			}, c.id))]
		})
	] });
}
function AuditTab() {
	const deck = useDeckStore((s) => s.deck());
	const select = useDeckStore((s) => s.select);
	if (!deck) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "No deck." });
	const cited = deck.slides.filter((s) => s.citations.length > 0).length;
	const score = Math.round(cited / Math.max(1, deck.slides.length) * 100);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md border border-border bg-elevated p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs uppercase tracking-wider text-muted",
				children: "Citation coverage"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 font-serif text-4xl tabular-nums text-fg",
				children: [score, "%"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-muted",
				children: [
					cited,
					"/",
					deck.slides.length,
					" slides carry evidence"
				]
			})
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "space-y-1",
		children: deck.slides.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: () => select(i),
			className: "flex min-h-11 w-full items-center justify-between rounded-xs px-1 py-2 text-left text-xs hover:bg-elevated",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "truncate text-fg",
				children: [
					i + 1,
					". ",
					s.title
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: s.citations.length ? "text-success" : "text-danger",
				children: s.citations.length ? `${s.citations.length} cited` : "missing"
			})]
		}) }, s.id))
	})] });
}
function CopilotTab() {
	const slide = useDeckStore((s) => s.slide());
	const index = useDeckStore((s) => s.selectedIndex);
	const patch = useDeckStore((s) => s.patchSlide);
	const [q, setQ] = (0, import_react.useState)("");
	const [log, setLog] = (0, import_react.useState)([]);
	const [busy, setBusy] = (0, import_react.useState)(false);
	async function run(refine) {
		if (!slide) return;
		setBusy(true);
		try {
			const res = await askCopilot({ data: {
				question: q || "How should I teach this slide?",
				slideTitle: slide.title,
				slideBody: slide.bullets.join("\n"),
				refine
			} });
			if (!res.ok) {
				toast.message(res.error);
				setLog((l) => [`${res.error}`, ...l]);
				return;
			}
			setLog((l) => [res.text, ...l]);
			if (refine) {
				const match = res.text.match(/\{[\s\S]*\}/);
				if (match) try {
					const json = JSON.parse(match[0]);
					patch(index, {
						title: json.title || slide.title,
						bullets: json.bullets || slide.bullets,
						notes: json.notes || slide.notes
					});
					toast.success("Slide refined.");
				} catch {}
			}
			setQ("");
		} catch {
			toast.message("Copilot is offline.");
		} finally {
			setBusy(false);
		}
	}
	if (!slide) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, { children: "Select a slide." });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "In-deck copilot",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
				value: q,
				onChange: (e) => setQ(e.target.value),
				placeholder: "Ask a question or describe how to refine this slide."
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "sm",
				variant: "secondary",
				disabled: busy,
				onClick: () => run(false),
				children: "Ask"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "sm",
				variant: "accent",
				disabled: busy,
				onClick: () => run(true),
				children: "Refine slide"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-2",
			children: log.map((entry, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "whitespace-pre-wrap rounded-sm bg-elevated p-2 font-sans text-xs text-muted",
				children: entry
			}, i))
		})
	] });
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: label }), children]
	});
}
function Empty({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children
	});
}
function SlideView({ slide, deck, index, total, citationStyle, className, present = false, editable = false, onPatch, onPatchDeck }) {
	const media = slide.layout === "title" ? void 0 : slide.media[0];
	const canEdit = editable && !present;
	const course = deck?.course || JUW.course;
	const courseCode = deck?.courseCode || JUW.courseCode;
	const preparedBy = deck?.preparedBy || JUW.preparedBy;
	const department = deck?.department || JUW.department;
	const isTitle = slide.layout === "title";
	const tokens = themeOf(isTitle ? "classic" : slide.theme);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("article", {
		className: cn("slide-stage relative flex h-full w-full flex-col overflow-hidden rounded-sm", className),
		"data-slide-stage": true,
		style: themeVars(isTitle ? "classic" : slide.theme),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex h-full min-h-0 flex-col border-[3px] p-1.5 sm:p-2",
			style: {
				borderColor: tokens.frame,
				background: tokens.band
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative flex min-h-0 flex-1 flex-col overflow-hidden border-[3px]",
				style: {
					borderColor: tokens.frame,
					background: tokens.slide,
					color: tokens.ink
				},
				children: [
					!isTitle ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "pointer-events-none absolute inset-y-0 left-0 w-2",
						style: { background: tokens.accent }
					}) : null,
					!isTitle ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeMotif, { theme: tokens.id }) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative z-[1] flex shrink-0 items-start justify-between gap-3 px-3 pt-3 sm:px-4 sm:pt-3.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: JUW.crest,
							alt: "Jinnah University for Women",
							className: "h-16 w-16 object-contain sm:h-20 sm:w-20"
						}), isTitle ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: JUW.microscope,
							alt: "Department of Microbiology, JUW",
							className: "h-[5.6rem] w-auto max-w-[11rem] object-contain sm:h-[6.75rem] sm:max-w-[13rem]"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "max-w-[9rem] rounded-sm border px-2 py-1 text-right text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] sm:max-w-none sm:text-[11px]",
							style: {
								borderColor: tokens.accent,
								background: tokens.band,
								color: tokens.navy
							},
							children: tokens.label
						})]
					}),
					isTitle ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative z-[1] flex min-h-0 flex-1 flex-col px-5 pb-4 sm:px-10",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-1 flex-col items-center justify-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditableText, {
								value: slide.title,
								onChange: (title) => onPatch?.({ title }),
								disabled: !canEdit,
								placeholder: "Lecture title",
								multiline: true,
								className: "w-full text-center font-serif text-2xl font-bold uppercase leading-tight text-ink sm:text-4xl lg:text-5xl"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ml-auto max-w-[55%] text-right",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mb-2.5 ml-auto h-1 w-9 bg-accent" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditableText, {
									value: course,
									onChange: (value) => onPatchDeck?.({ course: value }),
									disabled: !canEdit,
									placeholder: "Course name",
									className: "text-[10px] font-medium uppercase leading-snug tracking-wide text-ink sm:text-xs"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditableText, {
									value: courseCode,
									onChange: (value) => onPatchDeck?.({ courseCode: value }),
									disabled: !canEdit,
									placeholder: "Course code",
									className: "text-[10px] font-medium uppercase leading-snug tracking-wide text-ink sm:text-xs"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1.5 text-[10px] font-medium uppercase leading-snug tracking-wide text-ink sm:text-xs",
									children: canEdit ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "block",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-ink-muted",
											children: "Prepared by: "
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											value: preparedBy,
											onChange: (e) => onPatchDeck?.({ preparedBy: e.target.value }),
											className: "w-[min(100%,12rem)] bg-transparent text-right uppercase outline-none hover:bg-navy/5 focus:bg-navy/5 focus:ring-2 focus:ring-accent/30"
										})]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: ["Prepared by: ", preparedBy] })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditableText, {
									value: department,
									onChange: (value) => onPatchDeck?.({ department: value }),
									disabled: !canEdit,
									placeholder: "Department",
									className: "text-[10px] font-medium uppercase leading-snug tracking-wide text-ink sm:text-xs"
								})
							]
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative z-[1] flex min-h-0 flex-1 flex-col px-5 pb-3 sm:px-8 sm:pb-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditableText, {
								value: slide.title,
								onChange: (title) => onPatch?.({ title }),
								disabled: !canEdit,
								placeholder: "Slide title",
								className: "font-serif text-lg font-semibold leading-snug text-navy sm:text-2xl"
							}),
							(canEdit || slide.subtitle) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditableText, {
								value: slide.subtitle,
								onChange: (subtitle) => onPatch?.({ subtitle }),
								disabled: !canEdit,
								placeholder: canEdit ? "Optional subtitle" : "",
								className: "mt-0.5 text-sm text-ink-muted"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: cn("mt-3 min-h-0 flex-1", slide.layout === "two-column" && "grid gap-4 sm:grid-cols-2"),
								children: slide.layout === "two-column" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BulletList, {
										items: slide.leftBullets,
										present,
										editable: canEdit,
										onChange: (leftBullets) => onPatch?.({ leftBullets })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BulletList, {
										items: slide.rightBullets,
										present,
										editable: canEdit,
										onChange: (rightBullets) => onPatch?.({ rightBullets })
									}),
									media ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlideMedia, {
										media,
										className: "overflow-hidden rounded-sm border border-navy/10 bg-navy/5 sm:col-span-2",
										imgClass: "max-h-32 w-full object-cover",
										caption: `${media.title} · ${media.credit} · ${media.license}`
									}) : null
								] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: cn("flex h-full gap-5", media && "flex-col sm:flex-row"),
									children: [
										slide.layout !== "full-image" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "min-w-0 flex-1",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BulletList, {
												items: slide.bullets,
												present,
												editable: canEdit,
												onChange: (bullets) => onPatch?.({ bullets })
											})
										}),
										media ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlideMedia, {
											media,
											className: cn("overflow-hidden rounded-sm border border-navy/10 bg-navy/5", slide.layout === "full-image" ? "flex-1" : "sm:w-[42%]"),
											imgClass: "h-full max-h-52 w-full object-cover sm:max-h-full",
											caption: `${media.title} · ${media.credit} · ${media.license}`
										}) : null,
										slide.layout === "full-image" && (slide.bullets.length > 0 || canEdit) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BulletList, {
											items: slide.bullets,
											present,
											editable: canEdit,
											onChange: (bullets) => onPatch?.({ bullets })
										}) : null,
										slide.layout === "blank" && canEdit && !slide.bullets.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BulletList, {
											items: [],
											present,
											editable: true,
											onChange: (bullets) => onPatch?.({ bullets })
										}) : null
									]
								})
							})
						]
					}),
					slide.citations.length > 0 && slide.layout !== "title" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
						className: "relative z-[1] border-t border-navy/10 px-5 py-1.5 text-[10px] leading-snug text-ink-muted sm:px-8",
						children: slide.citations.slice(0, 2).map((c) => formatCitation(c, citationStyle)).join("  ·  ")
					}),
					slide.layout !== "title" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "pointer-events-none absolute bottom-1.5 left-3 z-[1] font-mono text-[9px] tabular-nums text-ink-muted",
						children: [
							String(index + 1).padStart(2, "0"),
							" / ",
							String(total).padStart(2, "0")
						]
					})
				]
			})
		})
	});
}
function ThemeMotif({ theme }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		className: "pointer-events-none absolute inset-0 h-full w-full text-accent opacity-50",
		viewBox: "0 0 1600 900",
		preserveAspectRatio: "xMaxYMin slice",
		"aria-hidden": true,
		children: [
			theme === "gram" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: "1380",
					cy: "160",
					rx: "78",
					ry: "18",
					transform: "rotate(-28 1380 160)",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: "1488",
					cy: "210",
					rx: "54",
					ry: "16",
					transform: "rotate(18 1488 210)",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: "1320",
					cy: "260",
					rx: "22",
					ry: "22",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: "1360",
					cy: "268",
					rx: "22",
					ry: "22",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: "1500",
					cy: "320",
					rx: "70",
					ry: "16",
					transform: "rotate(-12 1500 320)",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: "1410",
					cy: "390",
					rx: "20",
					ry: "20",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: "1452",
					cy: "398",
					rx: "20",
					ry: "20",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: "1348",
					cy: "470",
					rx: "62",
					ry: "15",
					transform: "rotate(32 1348 470)",
					fill: "currentColor"
				})
			] }) : null,
			theme === "culture" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1480",
					cy: "220",
					r: "150",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "10"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1480",
					cy: "220",
					r: "108",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "6"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1480",
					cy: "220",
					r: "64",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "4"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1436",
					cy: "188",
					r: "14",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1518",
					cy: "236",
					r: "10",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1460",
					cy: "268",
					r: "8",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1528",
					cy: "168",
					r: "7",
					fill: "currentColor"
				})
			] }) : null,
			theme === "fluorescence" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1480",
					cy: "180",
					r: "120",
					fill: "currentColor",
					opacity: "0.25"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1360",
					cy: "300",
					r: "18",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1500",
					cy: "260",
					r: "10",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1420",
					cy: "140",
					r: "8",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1540",
					cy: "340",
					r: "14",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1300",
					cy: "200",
					r: "6",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1470",
					cy: "420",
					r: "9",
					fill: "currentColor"
				})
			] }) : null,
			theme === "molecular" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "1420",
					y: "120",
					width: "140",
					height: "16",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "1440",
					y: "160",
					width: "100",
					height: "12",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "1410",
					y: "196",
					width: "160",
					height: "14",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "1460",
					y: "236",
					width: "70",
					height: "12",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "1430",
					y: "276",
					width: "120",
					height: "14",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "1475",
					y: "316",
					width: "50",
					height: "12",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "1420",
					y: "356",
					width: "140",
					height: "14",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M1320 480 c40-40 80 40 120 0 s80 40 120 0",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "6"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M1320 520 c40 40 80-40 120 0 s80-40 120 0",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "6"
				})
			] }) : null,
			theme === "clinical" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "1468",
					y: "130",
					width: "28",
					height: "110",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "1426",
					y: "172",
					width: "112",
					height: "28",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1360",
					cy: "320",
					r: "16",
					fill: "currentColor",
					opacity: "0.7"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1520",
					cy: "360",
					r: "10",
					fill: "currentColor",
					opacity: "0.7"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1440",
					cy: "410",
					r: "7",
					fill: "currentColor",
					opacity: "0.7"
				})
			] }) : null,
			theme === "mycology" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M1480 120 C1460 200 1500 240 1470 320 C1440 390 1500 430 1480 520",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "8"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M1470 220 C1410 240 1390 280 1360 330",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "6"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M1484 280 C1540 300 1560 340 1580 390",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "6"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M1476 360 C1420 390 1410 430 1380 470",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "5"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1360",
					cy: "330",
					r: "8",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1580",
					cy: "390",
					r: "8",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1380",
					cy: "470",
					r: "7",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1480",
					cy: "520",
					r: "10",
					fill: "currentColor"
				})
			] }) : null,
			theme === "outbreak" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1380",
					cy: "180",
					r: "10",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1500",
					cy: "150",
					r: "8",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1540",
					cy: "260",
					r: "12",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1420",
					cy: "300",
					r: "9",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1480",
					cy: "400",
					r: "11",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1340",
					cy: "360",
					r: "7",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1560",
					cy: "360",
					r: "7",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M1380 180 L1500 150 L1540 260 L1420 300 L1380 180 M1420 300 L1480 400 L1340 360 L1420 300 M1540 260 L1560 360 L1480 400",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "4"
				})
			] }) : null,
			theme === "parasitology" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: "1460",
					cy: "180",
					rx: "70",
					ry: "28",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "6"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: "1460",
					cy: "180",
					rx: "22",
					ry: "10",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1520",
					cy: "300",
					r: "16",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1388",
					cy: "340",
					r: "10",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M1320 430 C1400 400 1500 460 1580 420",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "5"
				})
			] }) : null,
			theme === "phycology" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: "1480",
					cy: "200",
					rx: "36",
					ry: "70",
					fill: "currentColor",
					opacity: "0.35"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: "1380",
					cy: "280",
					rx: "22",
					ry: "48",
					fill: "currentColor",
					opacity: "0.45"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: "1560",
					cy: "300",
					rx: "18",
					ry: "40",
					fill: "currentColor",
					opacity: "0.4"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1480",
					cy: "200",
					r: "8",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "1380",
					cy: "280",
					r: "5",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M1440 380 H1560",
					stroke: "currentColor",
					strokeWidth: "4"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M1460 400 H1540",
					stroke: "currentColor",
					strokeWidth: "3"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M1480 420 H1520",
					stroke: "currentColor",
					strokeWidth: "3"
				})
			] }) : null
		]
	});
}
function SlideMedia({ media, className, imgClass, caption }) {
	const remote = mediaDisplaySrc(media.src);
	const local = remote.startsWith("data:") || remote.startsWith("/") || remote.startsWith("blob:");
	const [src, setSrc] = (0, import_react.useState)(() => local ? remote : fallbackVisual(media.title).src);
	(0, import_react.useEffect)(() => {
		const display = mediaDisplaySrc(media.src);
		if (display.startsWith("data:") || display.startsWith("/") || display.startsWith("blob:")) {
			setSrc(display);
			return;
		}
		const placeholder = fallbackVisual(media.title).src;
		setSrc(placeholder);
		const probe = new Image();
		probe.referrerPolicy = "no-referrer";
		probe.onload = () => setSrc(display);
		probe.src = display;
		return () => {
			probe.onload = null;
			probe.onerror = null;
		};
	}, [
		media.id,
		media.src,
		media.title
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
		className,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src,
			alt: media.title,
			className: imgClass,
			referrerPolicy: "no-referrer",
			onError: () => {
				if (src.startsWith("data:")) return;
				setSrc(fallbackVisual(media.title).src);
			}
		}), caption ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("figcaption", {
			className: "truncate px-1.5 py-0.5 text-[8px] text-ink-muted sm:text-[10px]",
			children: caption
		}) : null]
	});
}
function EditableText({ value, onChange, className, placeholder, multiline = false, disabled = false }) {
	if (disabled) {
		if (!value && !placeholder) return null;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className,
			children: value
		});
	}
	const shared = cn("w-full bg-transparent outline-none placeholder:text-ink-muted/45", "rounded-xs transition hover:bg-navy/5 focus:bg-navy/5 focus:ring-2 focus:ring-accent/30", className);
	if (multiline) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		value,
		rows: 2,
		onChange: (e) => onChange?.(e.target.value),
		placeholder,
		className: cn(shared, "resize-none text-center"),
		"aria-label": placeholder || "Edit text"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		value,
		onChange: (e) => onChange?.(e.target.value),
		placeholder,
		className: shared,
		"aria-label": placeholder || "Edit text"
	});
}
function BulletList({ items, present, editable, onChange }) {
	const rows = editable ? [...items, ""] : items;
	if (!rows.length) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: cn("space-y-1.5 text-ink", present ? "text-lg sm:text-xl" : "text-sm sm:text-base"),
		children: rows.map((item, i) => {
			const isAdd = editable && i === items.length;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex gap-2.5 leading-relaxed",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("mt-2 size-1.5 shrink-0 rounded-full", isAdd ? "bg-accent/40" : "bg-accent") }), editable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: item,
					placeholder: isAdd ? "Add a teaching point…" : "",
					onChange: (e) => {
						const next = items.slice();
						if (isAdd) next.push(e.target.value);
						else next[i] = e.target.value;
						onChange?.(next);
					},
					onKeyDown: (e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							const next = items.slice();
							if (isAdd) {
								if (item.trim()) next.push(item);
								next.push("");
							} else next.splice(i + 1, 0, "");
							onChange?.(next.filter((x, idx) => x.trim().length > 0 || idx !== next.length - 1));
						}
						if (e.key === "Backspace" && item === "" && !isAdd) {
							e.preventDefault();
							onChange?.(items.filter((_, idx) => idx !== i));
						}
					},
					onBlur: () => {
						if (!isAdd) onChange?.(items.map((x) => x.trim()).filter(Boolean));
					},
					className: "min-h-8 w-full bg-transparent outline-none placeholder:text-ink-muted/40 hover:bg-navy/5 focus:bg-navy/5 focus:ring-2 focus:ring-accent/30"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item })]
			}, i);
		})
	});
}
function Presenter() {
	const presenting = useDeckStore((s) => s.presenting);
	const setPresenting = useDeckStore((s) => s.setPresenting);
	const deck = useDeckStore((s) => s.deck());
	const index = useDeckStore((s) => s.selectedIndex);
	const select = useDeckStore((s) => s.select);
	const style = useDeckStore((s) => s.citationStyle);
	const slide = deck?.slides[index];
	(0, import_react.useEffect)(() => {
		if (!presenting) return;
		const onKey = (e) => {
			if (e.key === "Escape") setPresenting(false);
			if (e.key === "ArrowRight" || e.key === " ") {
				e.preventDefault();
				select(index + 1);
			}
			if (e.key === "ArrowLeft") {
				e.preventDefault();
				select(index - 1);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [
		presenting,
		index,
		select,
		setPresenting
	]);
	if (!presenting || !deck || !slide) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-[80] flex flex-col bg-navy p-3 sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-3 flex items-center justify-between text-fg",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "truncate font-serif text-sm",
					children: deck.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon-sm",
							onClick: () => select(index - 1),
							"aria-label": "Previous",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, {})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon-sm",
							onClick: () => select(index + 1),
							"aria-label": "Next",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, {})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon-sm",
							onClick: () => setPresenting(false),
							"aria-label": "Exit",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {})
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto flex min-h-0 w-full max-w-6xl flex-1 items-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlideView, {
					slide,
					deck,
					index,
					total: deck.slides.length,
					citationStyle: style,
					present: true
				})
			}),
			slide.notes ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mx-auto mt-3 max-w-6xl text-xs text-muted",
				children: ["Speaker: ", slide.notes]
			}) : null
		]
	});
}
function Wordmark({ compact = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-w-0 items-center gap-2.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: JUW.crestMark,
			alt: "Jinnah University for Women",
			className: "size-9 shrink-0 bg-white object-contain"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0 leading-tight",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "truncate font-serif text-[15px] tracking-tight text-fg",
				children: JUW.name
			}), !compact && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-[10px] uppercase tracking-[0.16em] text-muted",
				children: [JUW.version, " · lecture studio"]
			})]
		})]
	});
}
function TooltipProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Provider, {
		delayDuration: 250,
		skipDelayDuration: 100,
		children
	});
}
function Tooltip({ content, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Root3, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trigger, {
		asChild: true,
		children
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
		sideOffset: 6,
		className: cn("z-50 rounded-xs border border-border bg-elevated px-2 py-1 text-xs text-fg shadow-panel"),
		children: content
	}) })] });
}
function EditorApp() {
	const theme = useDeckStore((s) => s.chromeTheme);
	const deck = useDeckStore((s) => s.deck());
	const slide = useDeckStore((s) => s.slide());
	const index = useDeckStore((s) => s.selectedIndex);
	const style = useDeckStore((s) => s.citationStyle);
	const select = useDeckStore((s) => s.select);
	const addSlide = useDeckStore((s) => s.addSlide);
	const removeSlide = useDeckStore((s) => s.removeSlide);
	const moveSlide = useDeckStore((s) => s.moveSlide);
	const patchDeck = useDeckStore((s) => s.patchDeck);
	const setLayout = useDeckStore((s) => s.setLayout);
	const railOpen = useDeckStore((s) => s.railOpen);
	const toggleRail = useDeckStore((s) => s.toggleRail);
	const toggleInspector = useDeckStore((s) => s.toggleInspector);
	const setPresenting = useDeckStore((s) => s.setPresenting);
	useDeckStore((s) => s.setGenerateOpen);
	useDeckStore((s) => s.setGeneratorOpen);
	const setLibraryOpen = useDeckStore((s) => s.setLibraryOpen);
	const setSettingsOpen = useDeckStore((s) => s.setSettingsOpen);
	const setTheme = useDeckStore((s) => s.setTheme);
	const generationMode = useDeckStore((s) => s.generationMode);
	(0, import_react.useEffect)(() => {
		const finish = () => useDeckStore.getState().hydrateSample();
		finish();
		const unsub = useDeckStore.persist.onFinishHydration(finish);
		if (useDeckStore.persist.hasHydrated()) finish();
		return unsub;
	}, []);
	(0, import_react.useEffect)(() => {
		document.documentElement.dataset.theme = theme;
	}, [theme]);
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			const tag = e.target?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
			if (e.key === "ArrowDown" || e.key === "ArrowRight") {
				e.preventDefault();
				select(index + 1);
			}
			if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
				e.preventDefault();
				select(index - 1);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [index, select]);
	async function onPptx() {
		if (!deck) return;
		try {
			toast.message("Embedding figures into PowerPoint…");
			await exportPptx(deck);
			toast.success("PowerPoint downloaded — figures are embedded on every slide.");
		} catch {
			toast.message("Could not write the PPTX file.");
		}
	}
	const [printing, setPrinting] = (0, import_react.useState)(false);
	function onPdf() {
		setPrinting(true);
		requestAnimationFrame(() => {
			window.print();
			setTimeout(() => setPrinting(false), 400);
		});
	}
	const cited = deck?.slides.filter((s) => s.citations.length > 0).length ?? 0;
	const total = deck?.slides.length ?? 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TooltipProvider, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex h-[100dvh] flex-col overflow-hidden bg-bg text-fg",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 sm:px-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon-sm",
						className: "lg:hidden",
						onClick: toggleRail,
						"aria-label": "Slides",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelLeft, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wordmark, { compact: true }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "hidden rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium tracking-wide text-accent-fg sm:inline",
						children: "v6.2.1"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: deck?.slides[0]?.layout === "title" ? deck.slides[0].title : deck?.title ?? "",
						onChange: (e) => useDeckStore.getState().renameTopic(e.target.value),
						className: "hidden h-9 max-w-sm border-transparent bg-transparent font-serif text-sm md:block",
						"aria-label": "Lecture topic",
						placeholder: "Type a topic — title slide updates"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `hidden rounded-full border px-2 py-0.5 text-[10px] tracking-wide sm:inline ${generationMode === "ai" ? "border-accent bg-accent/15 text-accent" : "border-border bg-elevated text-muted"}`,
						children: generationMode === "ai" ? "AI mode" : "Manual mode"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ml-auto flex items-center gap-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
								content: "New deck",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "accent",
									size: "sm",
									onClick: () => {
										const state = useDeckStore.getState();
										const draft = state.generateDraft;
										const topic = draft.topic.trim();
										state.setGeneratorOpen(true);
										if (!topic) {
											if (window.innerWidth < 1024) state.setGenerateOpen(true);
											document.getElementById("gen-topic")?.focus();
											toast.message("Type a lecture topic. The title slide updates as you type, then press Generate.");
											return;
										}
										state.generate({
											topic,
											discipline: draft.discipline,
											count: draft.count,
											level: draft.level,
											notes: draft.notes,
											mode: draft.mode,
											course: draft.course,
											courseCode: draft.courseCode,
											preparedBy: draft.preparedBy,
											department: JUW.department
										});
										toast.success(`“${topic}” — title slide shows only that name.`);
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Microscope, { className: "size-3.5" }), "Generate"]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
								content: "Library",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "icon-sm",
									onClick: () => setLibraryOpen(true),
									"aria-label": "Library",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Library, {})
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
								content: "Present",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "icon-sm",
									onClick: () => setPresenting(true),
									"aria-label": "Present",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, {})
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
								content: "Export PPTX",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "icon-sm",
									onClick: onPptx,
									"aria-label": "Export PPTX",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {})
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
								content: "Print / PDF",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "icon-sm",
									onClick: onPdf,
									"aria-label": "Print",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Printer, {})
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
								content: theme === "dark" ? "Light chrome" : "Dark chrome",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "icon-sm",
									onClick: () => setTheme(theme === "dark" ? "light" : "dark"),
									"aria-label": "Toggle theme",
									children: theme === "dark" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, {})
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
								content: "Settings",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "icon-sm",
									onClick: () => setSettingsOpen(true),
									"aria-label": "Settings",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, {})
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon-sm",
								className: "lg:hidden",
								onClick: toggleInspector,
								"aria-label": "Inspector",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelRight, {})
							})
						]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative flex min-h-0 flex-1",
				children: [
					railOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "absolute inset-0 z-20 bg-navy/50 lg:hidden",
						"aria-label": "Close slides",
						onClick: toggleRail
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
						className: `flex w-56 shrink-0 flex-col border-r border-border bg-surface max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-30 max-lg:shadow-panel ${railOpen ? "max-lg:flex" : "max-lg:hidden"} lg:flex`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wider text-muted",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									"Slides · ",
									total,
									" · ",
									cited,
									" cited"
								] })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "min-h-0 flex-1 overflow-y-auto px-2 pb-2",
								children: deck?.slides.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => {
										select(i);
										if (window.innerWidth < 1024) useDeckStore.getState().toggleRail();
									},
									className: `mb-1.5 w-full rounded-sm border p-2 text-left ${i === index ? "border-accent bg-elevated" : "border-transparent hover:bg-elevated"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "flex items-center justify-between text-[10px] uppercase tracking-wider text-muted",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "tabular-nums",
											children: String(i + 1).padStart(2, "0")
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: s.layout })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-0.5 block truncate text-sm text-fg",
										children: s.title
									})]
								}, s.id))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-1 border-t border-border p-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										variant: "secondary",
										size: "sm",
										className: "flex-1",
										onClick: addSlide,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-3.5" }), "Add"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										variant: "ghost",
										size: "icon-sm",
										onClick: () => moveSlide(index, -1),
										"aria-label": "Move up",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, {})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										variant: "ghost",
										size: "icon-sm",
										onClick: () => moveSlide(index, 1),
										"aria-label": "Move down",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										variant: "ghost",
										size: "icon-sm",
										onClick: () => removeSlide(index),
										"aria-label": "Delete slide",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {})
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "px-3 pb-2 text-[10px] leading-snug text-faint",
								children: "Arrow keys to navigate. Unlimited slides."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
						className: "flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto bg-bg p-3 sm:p-5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GeneratePanel, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-2 text-xs text-muted",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "flex items-center gap-2",
											children: ["Layout", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
												value: slide?.layout ?? "content",
												onChange: (e) => setLayout(e.target.value),
												className: "h-10 rounded-sm border border-border bg-elevated px-2 text-sm text-fg",
												"aria-label": "Slide layout",
												children: LAYOUTS.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: l,
													children: l
												}, l))
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "flex items-center gap-2",
											children: ["Theme", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
												value: slide?.layout === "title" ? "classic" : slide?.theme ?? "classic",
												disabled: slide?.layout === "title",
												onChange: (e) => useDeckStore.getState().patchSlide(index, { theme: e.target.value }),
												className: "h-10 rounded-sm border border-border bg-elevated px-2 text-sm text-fg disabled:opacity-60",
												"aria-label": "Slide theme",
												children: SLIDE_THEMES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: t,
													children: THEME_TOKENS[t].label
												}, t))
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex flex-wrap gap-1",
											children: SLIDE_THEMES.map((t) => {
												const tok = THEME_TOKENS[t];
												const active = (slide?.layout === "title" ? "classic" : slide?.theme ?? "classic") === t;
												return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													title: slide?.layout === "title" ? "The introduction keeps the official JUW frame" : tok.blurb,
													disabled: slide?.layout === "title" && t !== "classic",
													onClick: () => {
														if (slide?.layout === "title") return;
														useDeckStore.getState().patchSlide(index, { theme: t });
													},
													className: `h-8 rounded-sm border px-1.5 text-[10px] uppercase tracking-wide disabled:opacity-40 ${active ? "ring-2 ring-accent" : ""}`,
													style: {
														background: tok.slide,
														color: tok.ink,
														borderColor: tok.frame
													},
													children: tok.label.split(" ")[0]
												}, t);
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "ml-auto tabular-nums",
											children: [
												"Slide ",
												total ? index + 1 : 0,
												" of ",
												total
											]
										})
									]
								}),
								slide && deck ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "w-full shrink-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlideView, {
										slide,
										deck,
										index,
										total: deck.slides.length,
										citationStyle: style,
										className: "h-auto",
										editable: true,
										onPatch: (patch) => {
											if (index === 0 && typeof patch.title === "string") {
												useDeckStore.getState().renameTopic(patch.title);
												const rest = { ...patch };
												delete rest.title;
												if (Object.keys(rest).length) useDeckStore.getState().patchSlide(0, rest);
												return;
											}
											useDeckStore.getState().patchSlide(index, patch);
										},
										onPatchDeck: patchDeck
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-2 text-[11px] text-muted",
										children: "Click any line on the slide to edit. The JUW crest stays top-left. The Department of Microbiology microscope appears only on the introductory slide."
									})]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-border text-center",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-serif text-lg text-fg",
										children: "No slides yet"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 max-w-sm text-sm text-muted",
										children: "Generate a deck with the form above, or add a slide from the left rail."
									})]
								}),
								slide?.notes ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "line-clamp-2 text-xs text-muted",
									children: ["Notes: ", slide.notes]
								}) : null
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InspectorPanel, {})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GenerateDialog, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LibraryDialog, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsDialog, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Presenter, {}),
		printing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrintRoot, {}) : null,
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
			theme: theme === "dark" ? "dark" : "light",
			position: "bottom-right"
		})
	] });
}
function LibraryDialog() {
	const open = useDeckStore((s) => s.libraryOpen);
	const setOpen = useDeckStore((s) => s.setLibraryOpen);
	const library = useDeckStore((s) => s.library);
	const load = useDeckStore((s) => s.loadDeck);
	const del = useDeckStore((s) => s.deleteDeck);
	const saveCopy = useDeckStore((s) => s.saveCopy);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Deck library" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Saved on this device. Duplicate before a risky rewrite." })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "secondary",
				size: "sm",
				onClick: saveCopy,
				children: "Duplicate current"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 max-h-72 space-y-2 overflow-y-auto",
				children: library.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center gap-2 rounded-sm border border-border p-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "min-w-0 flex-1 text-left",
						onClick: () => load(d.id),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block truncate text-sm text-fg",
							children: d.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-xs text-muted",
							children: [
								d.discipline,
								" · ",
								d.slides.length,
								" slides"
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon-sm",
						onClick: () => del(d.id),
						"aria-label": "Delete deck",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {})
					})]
				}, d.id))
			})
		] })
	});
}
function SettingsDialog() {
	const open = useDeckStore((s) => s.settingsOpen);
	const setOpen = useDeckStore((s) => s.setSettingsOpen);
	const style = useDeckStore((s) => s.citationStyle);
	const setStyle = useDeckStore((s) => s.setCitationStyle);
	const deck = useDeckStore((s) => s.deck());
	const patchDeck = useDeckStore((s) => s.patchDeck);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Studio settings" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Course header fields print on the official title slide. Citation style applies to the inspector, footers, and PPTX." })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					htmlFor: "course",
					children: "Course"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					id: "course",
					value: deck?.course ?? "",
					onChange: (e) => patchDeck({ course: e.target.value }),
					placeholder: "Microbial Enzyme Technology"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					htmlFor: "ccode",
					children: "Course code"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					id: "ccode",
					value: deck?.courseCode ?? "",
					onChange: (e) => patchDeck({ courseCode: e.target.value }),
					placeholder: "MIC-4511"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					htmlFor: "prep",
					children: "Prepared by"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					id: "prep",
					value: deck?.preparedBy ?? "",
					onChange: (e) => patchDeck({ preparedBy: e.target.value }),
					placeholder: "Ms. Noor"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					htmlFor: "dept",
					children: "Department"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					id: "dept",
					value: deck?.department ?? "",
					onChange: (e) => patchDeck({ department: e.target.value }),
					placeholder: "Department of Microbiology"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					htmlFor: "cstyle",
					children: "Citation style"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					id: "cstyle",
					value: style,
					onChange: (e) => setStyle(e.target.value),
					className: "h-10 rounded-sm border border-border bg-elevated px-2 text-sm",
					children: CITATION_STYLES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: s }, s))
				})]
			})
		] })
	});
}
function PrintRoot() {
	const deck = useDeckStore((s) => s.deck());
	const style = useDeckStore((s) => s.citationStyle);
	if (!deck) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		id: "print-root",
		className: "hidden print:block",
		children: deck.slides.map((slide, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "print-slide",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlideView, {
				slide,
				deck,
				index: i,
				total: deck.slides.length,
				citationStyle: style,
				present: true
			})
		}, slide.id))
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditorApp, {});
}
//#endregion
export { Home as component };
