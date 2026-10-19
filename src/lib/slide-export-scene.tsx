import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { SlideView } from "@/components/slide-view";
import type { Deck } from "./types";

export const SLIDE_SIZE = { width: 1280, height: 720, pixelsPerInch: 96 };
export type Bounds = { x: number; y: number; w: number; h: number };
export type SceneItem =
  | (Bounds & {
      kind: "rect";
      fill?: string;
      fillAlpha?: number;
      lineAlpha?: number;
      line?: string;
      lineWidth: number;
      opacity: number;
    })
  | (Bounds & {
      kind: "text";
      text: string;
      font: string;
      size: number;
      bold: boolean;
      color: string;
      opacity: number;
    })
  | (Bounds & { kind: "image"; src: string; cover: boolean; opacity: number });

function rgba(value: string): { hex: string; alpha: number } {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return { hex: [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join(""), alpha: a / 255 };
}
function color(value: string): string | undefined {
  const c = rgba(value);
  return c.alpha ? c.hex : undefined;
}

/** Capture the same fixed composition used by preview/presentation/print.
 * Only artwork is an image. Text stays native, editable PowerPoint text.
 */
export async function slideExportScene(deck: Deck, index: number): Promise<SceneItem[]> {
  const host = document.createElement("div");
  Object.assign(host.style, {
    position: "fixed",
    left: "-100000px",
    top: "0",
    width: "1280px",
    height: "720px",
    pointerEvents: "none",
  });
  host.setAttribute("aria-hidden", "true");
  document.body.append(host);
  const root = createRoot(host);
  try {
    flushSync(() =>
      root.render(
        <SlideView
          slide={deck.slides[index]}
          deck={deck}
          index={index}
          total={deck.slides.length}
          citationStyle={deck.citationStyle}
        />,
      ),
    );
    await document.fonts.ready;
    await Promise.all(
      [...host.querySelectorAll("img")].map((img) =>
        Promise.race([
          img.decode().catch(() => undefined),
          new Promise((resolve) => window.setTimeout(resolve, 8000)),
        ]),
      ),
    );
    const stage = host.querySelector<HTMLElement>("[data-slide-stage]")!;
    const origin = stage.getBoundingClientRect();
    const items: SceneItem[] = [];
    const bounds = (r: DOMRect): Bounds => ({
      x: r.left - origin.left,
      y: r.top - origin.top,
      w: r.width,
      h: r.height,
    });
    function visit(el: Element, inheritedOpacity = 1) {
      const css = getComputedStyle(el);
      if (css.display === "none" || css.visibility === "hidden") return;
      const opacity = inheritedOpacity * Number(css.opacity);
      const box = bounds(el.getBoundingClientRect());
      if (!box.w || !box.h) return;
      if (el instanceof SVGSVGElement) {
        const clone = el.cloneNode(true) as SVGSVGElement;
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clone.setAttribute("width", String(box.w));
        clone.setAttribute("height", String(box.h));
        clone.style.color = css.color;
        items.push({
          ...box,
          kind: "image",
          src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`,
          cover: false,
          opacity,
        });
        return;
      }
      const background = rgba(css.backgroundColor);
      const border = rgba(css.borderTopColor);
      const fill = background.alpha ? background.hex : undefined;
      const line = color(css.borderTopColor);
      const lineWidth = Number.parseFloat(css.borderTopWidth);
      if (fill || (line && lineWidth > 0))
        items.push({
          ...box,
          kind: "rect",
          fill,
          fillAlpha: background.alpha,
          lineAlpha: border.alpha,
          line: lineWidth ? line : undefined,
          lineWidth,
          opacity,
        });
      // Bullet dots use a background with no text, handled as small native shapes.
      if (el instanceof HTMLImageElement) {
        if (el.naturalWidth)
          items.push({
            ...box,
            kind: "image",
            src: el.currentSrc || el.src,
            cover: css.objectFit === "cover",
            opacity,
          });
        else
          items.push({
            ...box,
            kind: "text",
            text: "Original image unavailable",
            font: "Arial",
            size: 14,
            bold: false,
            color: color(css.color) || "5C6B7A",
            opacity,
          });
        return;
      }
      for (const child of el.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE) visit(child as Element, opacity);
        else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
          // Preserve browser line breaks and positions rather than asking another
          // layout engine to wrap the same paragraph differently.
          const text = child.textContent;
          const lines: Array<{ text: string; rect: DOMRect }> = [];
          const range = document.createRange();
          for (let i = 0; i < text.length; i++) {
            range.setStart(child, i);
            range.setEnd(child, i + 1);
            const r = range.getBoundingClientRect();
            if (!r.height || !r.width) continue;
            const last = lines.at(-1);
            if (last && Math.abs(last.rect.top - r.top) < 1) {
              last.text += text[i];
              last.rect = new DOMRect(
                last.rect.left,
                last.rect.top,
                r.right - last.rect.left,
                Math.max(last.rect.height, r.height),
              );
            } else lines.push({ text: text[i], rect: r });
          }
          for (const line of lines)
            if (line.text.trim())
              items.push({
                ...bounds(line.rect),
                kind: "text",
                text: css.textTransform === "uppercase" ? line.text.toUpperCase() : line.text,
                font: css.fontFamily.includes("Georgia") ? "Georgia" : "Arial",
                size: Number.parseFloat(css.fontSize),
                bold: Number(css.fontWeight) >= 600,
                color: color(css.color) || "1A2433",
                opacity,
              });
        }
      }
    }
    visit(stage);
    return items;
  } finally {
    root.unmount();
    host.remove();
  }
}

export function sceneOverflow(scene: SceneItem[]) {
  return scene.filter(
    (i) => i.kind === "text" && (i.x < 0 || i.y < 0 || i.x + i.w > 1281 || i.y + i.h > 721),
  );
}
