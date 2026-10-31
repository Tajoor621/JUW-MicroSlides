const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export function contrastRatio(a: string, b: string) {
  const luminance = (hex: string) =>
    rgb(hex)
      .map((v) => {
        const s = v / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const cache = new Map<string, string>();
/** Preserve hue as far as possible while meeting normal-text contrast on both theme surfaces. */
export function readableColour(foreground: string, backgrounds: string[], minimum = 4.5) {
  const key = [foreground, ...backgrounds, minimum].join("|");
  const prior = cache.get(key);
  if (prior) return prior;
  const passes = (c: string) => backgrounds.every((b) => contrastRatio(c, b) >= minimum);
  if (passes(foreground)) return foreground;
  const original = rgb(foreground);
  let best = foreground,
    distance = Infinity;
  for (const target of [0, 255])
    for (let step = 1; step <= 255; step++) {
      const channels = original.map((v) => Math.round(v + ((target - v) * step) / 255));
      const candidate = "#" + channels.map((v) => v.toString(16).padStart(2, "0")).join("");
      if (passes(candidate)) {
        const d = channels.reduce((s, v, i) => s + (v - original[i]) ** 2, 0);
        if (d < distance) {
          best = candidate;
          distance = d;
        }
        break;
      }
    }
  cache.set(key, best);
  return best;
}
