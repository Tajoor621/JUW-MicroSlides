import type { MediaItem } from "./types";
export function taggedMedia(media: MediaItem): MediaItem {
  return {
    ...media,
    tags: media.tags?.length
      ? media.tags
      : [
          media.kind === "diagram"
            ? "schematic"
            : media.kind === "micrograph"
              ? "micrograph"
              : media.kind === "chart"
                ? "growth-curve"
                : "other",
        ],
  };
}
export function mediaAttachmentProblem(media: MediaItem) {
  if (!media.license.trim() || /unknown|verify|not supplied|not provided/i.test(media.license))
    return "Confirm the image licence before attaching it.";
  if (!media.credit.trim() || /unknown|not supplied|not provided/i.test(media.credit))
    return "Supply the creator or institutional attribution before attaching this image.";
  if (!media.source.trim())
    return "Supply an original source attribution before attaching this image.";
  if (!taggedMedia(media).tags?.length) return "Select a scientific media tag.";
  return "";
}
