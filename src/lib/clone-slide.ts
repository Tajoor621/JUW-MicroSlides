import type { Slide } from "./types";

/**
 * Copy teaching content onto a new slide.
 * Review records stay with the original: a copy is a new unreviewed draft.
 */
export function cloneSlide(
  source: Slide,
  ids: { slide: string; next: (prefix: string) => string },
): Slide {
  const copy = structuredClone(source);
  const mediaIds = new Map<string, string>();
  copy.media = (copy.media ?? []).map((item) => {
    const id = ids.next("m");
    mediaIds.set(item.id, id);
    return { ...item, id };
  });
  copy.citations = (copy.citations ?? []).map((item) => ({ ...item, id: ids.next("c") }));
  if (copy.assessment) {
    copy.assessment = copy.assessment.map((item) =>
      item.mediaId && mediaIds.has(item.mediaId)
        ? { ...item, mediaId: mediaIds.get(item.mediaId) }
        : item,
    );
  }
  copy.id = ids.slide;
  copy.locked = false;
  delete copy.claims;
  delete copy.surfaceReviews;
  return copy;
}
