/** Preserve scientific comparisons while removing actual publisher markup. */
export function scientificPlainText(raw: string) {
  return raw
    .replace(/<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s+[^<>]*?)?\s*\/?>/g, (tag) =>
      /^<\/?(?:p|sec|br|div)\b/i.test(tag) ? " " : "",
    )
    .replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, (entity) => {
      const named: Record<string, string> = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&apos;": "'",
      };
      if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
      const hex = entity.toLowerCase().startsWith("&#x");
      const code = Number.parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : entity;
    })
    .replace(/\s+/g, " ")
    .trim();
}
export type SourcePassage = { sentences: string[]; paragraph: number; context: string };
export function coherentSourcePassages(
  raw: string,
  fullText: boolean,
  relevant: (text: string) => boolean,
): SourcePassage[] {
  const paragraphs = (fullText ? raw : raw.replace(/<\/(?:p|sec)>|<br\s*\/?>/gi, "\n\n"))
    .split(/\n\s*\n/)
    .map((p) => (fullText ? p.replace(/\s+/g, " ").trim() : scientificPlainText(p)));
  const result: SourcePassage[] = [];
  for (const [index, paragraph] of paragraphs.entries()) {
    if (paragraph.length > 6000) continue;
    const sentences = paragraph.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
    // A rejected sentence breaks adjacency: never join across a removed method/qualification.
    let run: string[] = [];
    const flush = () => {
      for (let i = 0; i < run.length; i += 2) {
        const remaining = run.length - i;
        if (remaining < 2) break;
        const chunk = run.slice(i, i + (remaining === 3 ? 3 : 2));
        if (relevant(chunk.join(" ")))
          result.push({ sentences: chunk, paragraph: index + 1, context: paragraph });
        if (remaining === 3) break;
      }
      run = [];
    };
    for (const s of sentences) {
      if (
        s.length <= 40 ||
        s.length >= 800 ||
        /copyright|all rights reserved|trial registration|competing interest|author contribution|funding:/i.test(
          s,
        )
      )
        flush();
      else run.push(s);
    }
    flush();
    if (result.length >= 12) break;
  }
  return result.slice(0, 12);
}
