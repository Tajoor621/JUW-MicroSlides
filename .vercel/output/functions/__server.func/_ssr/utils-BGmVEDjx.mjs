import { n as clsx } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/utils-BGmVEDjx.js
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function uid(prefix = "id") {
	return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
/** Stable identity for a media file so the same Commons photo cannot appear twice. */
function mediaKey(src) {
	if (!src) return "";
	if (src.startsWith("data:") || src.startsWith("blob:")) return src;
	const file = wikimediaFileName(src);
	if (file) return `commons:${file.toLowerCase()}`;
	try {
		const u = new URL(src, "https://local.invalid");
		u.hash = "";
		const path = u.pathname.replace(/\/$/, "");
		return `${u.origin}${path}`.toLowerCase();
	} catch {
		return src.split("?")[0].toLowerCase();
	}
}
function mediaDisplaySrc(src) {
	if (!src || src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("/")) return src;
	if (src.includes("iiif.wellcomecollection.org") && src.includes("info.json")) {
		const id = src.split("/image/")[1]?.split("/")[0];
		if (id) return `https://iiif.wellcomecollection.org/image/${id}/full/640,/0/default.jpg`;
	}
	const file = wikimediaFileName(src);
	if (file && src.includes("thumb.php")) return `https://commons.wikimedia.org/w/thumb.php?f=${encodeURIComponent(file)}&width=640`;
	if (file && (src.includes("wikimedia.org") || src.includes("wikipedia.org"))) return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=640`;
	return src;
}
function wikimediaFileName(src) {
	try {
		const u = new URL(src, "https://commons.wikimedia.org");
		const fromQuery = u.searchParams.get("f") || u.searchParams.get("file");
		if (fromQuery) return decodeURIComponent(fromQuery.replace(/\+/g, " "));
		const clean = decodeURIComponent(u.pathname);
		if (clean.includes("Special:FilePath/")) return (clean.split("Special:FilePath/")[1] || "").replace(/\/$/, "") || null;
		const parts = clean.split("/").filter(Boolean);
		if (clean.includes("/thumb/") && parts.length >= 2) return parts[parts.length - 2];
		let file = parts[parts.length - 1] || "";
		if (file === "thumb.php" || file === "index.php") return null;
		file = file.replace(/^\d+px-/, "");
		if (file.endsWith(".svg.png")) file = file.slice(0, -4);
		return file || null;
	} catch {
		return null;
	}
}
//#endregion
export { wikimediaFileName as a, uid as i, mediaDisplaySrc as n, mediaKey as r, cn as t };
