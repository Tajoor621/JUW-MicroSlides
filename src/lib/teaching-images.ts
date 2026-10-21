import type { Deck } from "./types";
export function decodeTeachingImage(src: string, index: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.referrerPolicy = "no-referrer";
    if (/^https?:/i.test(src)) image.crossOrigin = "anonymous";
    const timer = setTimeout(
      () => reject(Error(`Slide ${index + 1}: image decoding timed out.`)),
      8000,
    );
    image.onload = () => {
      clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timer);
      reject(Error(`Slide ${index + 1}: a required image could not be decoded.`));
    };
    image.src = src;
  });
}
export async function preflightTeachingImages(deck: Deck) {
  for (const [index, slide] of deck.slides.entries()) {
    if (slide.layout === "title" || slide.teaching?.diagram || !slide.media[0]) continue;
    if (slide.media[0].kind === "video")
      throw Error(`Slide ${index + 1}: attach a static teaching visual for export.`);
    const image = await decodeTeachingImage(slide.media[0].src, index);
    if (slide.teaching?.scaleBar && slide.teaching.scaleBar.pixels > image.naturalWidth)
      throw Error(`Slide ${index + 1}: scale calibration exceeds the original image width.`);
  }
}
