/** Extract topic labels, never rewrite a study's findings into asserted facts.
 * Body quotations and evidence remain untouched; headings still require review. */
const boundaries = new Set(
  "a an the this these those that which who whose we our us their its it they them is are was were be been being am has have had do does did can could may might must will would should not no neither nor all always never only also both each every any some many most more much less very such other than then therefore however thus although because while whereas if when where how why what whether as at by for from in into on onto out over per through to under upon via with without within during between among of and or but show shows showed shown showing reveal reveals revealed revealing demonstrate demonstrates demonstrated suggest suggests suggested suggesting propose proposes proposed found find finds observed observe observed measured measure measured investigated investigate investigated used use uses reported report reports indicate indicates indicated include includes included require requires required mediate mediates mediated regulate regulates regulated result results resulted influence influences influenced affect affects affected remain remains remained increase increases increased decrease decreases decreased inhibit inhibits inhibited promote promotes promoted ensure ensures ensured enable enables enabled contain contains contained provide provides provided describe describes described focus focuses focused based due known important essential vital fundamental recent experimentally move moves moved".split(
    " ",
  ),
);
const key = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const matches = (value: string) => [
  ...value.matchAll(/[\p{L}\p{N}]+(?:[-–'’][\p{L}\p{N}]+)*[+−–]?/gu),
];
const words = (value: string) => matches(value).map((m) => m[0]);

export function sourceConceptHeading(sentences: string[], topic: string, used: Set<string>) {
  const topicKey = key(topic);
  const candidates: { text: string; score: number; order: number }[] = [];
  const frequencies = new Map<string, number>();
  for (const sentence of sentences)
    for (const word of words(sentence)) {
      const k = word.toLowerCase();
      if (!boundaries.has(k)) frequencies.set(k, (frequencies.get(k) || 0) + 1);
    }
  for (const [sentenceIndex, sentence] of sentences.entries()) {
    const clean = sentence
      .replace(/^(?:background|objectives?|methods?|results?|conclusions?)\s*:\s*/i, "")
      .replace(/^(?:recent studies|this (?:study|review)|our (?:study|results|data))\s*/i, "");
    // Punctuation is a boundary too: don't join terms across different clauses.
    for (const clause of clean.split(/[;:,!?()[\]{}=/]|(?<=[a-z\d])\.(?=\s|$)/)) {
      let phrase: { word: string; start: number; end: number }[] = [];
      const collect = () => {
        if (!phrase.length) return;
        // Long runs are kept as bounded source-contiguous windows, not chopped sentences.
        for (let i = 0; i < phrase.length; i += 5) {
          const run = phrase.slice(i, i + 5);
          const text = clause.slice(run[0].start, run[run.length - 1].end);
          if (
            text.length < 4 ||
            text.length > 68 ||
            run.some(({ word }) => /^\p{N}+$/u.test(word)) ||
            /^(?:study|studies|review|data|results?|different|aspects?|demands?|modes?)$/i.test(
              text,
            )
          )
            continue;
          const k = key(text);
          if (k === topicKey) continue;
          const repeated = run.reduce(
            (sum, { word }) => sum + Math.min(2, (frequencies.get(word.toLowerCase()) || 1) - 1),
            0,
          );
          const score =
            Math.min(run.length, 4) * 2 +
            repeated / run.length +
            (sentenceIndex === 0 ? 2 : 0) -
            i / 10 -
            (used.has(k) ? 100 : 0);
          candidates.push({ text, score, order: candidates.length });
        }
        phrase = [];
      };
      for (const match of matches(clause)) {
        const word = match[0],
          start = match.index!;
        if (boundaries.has(word.toLowerCase())) collect();
        else phrase.push({ word, start, end: start + word.length });
      }
      collect();
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.order - b.order);
  const chosen = candidates[0]?.text || "Source excerpt";
  // Preserve scientific identifiers/case (e.g. qPCR, ParA, 16S, η).
  const base = chosen;
  let title = base;
  for (let n = 2; used.has(key(title)); n++) title = `${base} (${n})`;
  used.add(key(title));
  return title;
}
