import { JUW, lectureMeta } from "./brand";
import { DISCIPLINES } from "./knowledge";
import { inferFocus } from "./topic-engine";
import { profileFor, topicOverlap, type TopicSection } from "./topic-content";
import { cycleTheme } from "./slide-themes";
import { MAX_SLIDES, type Deck, type GenerateInput, type Slide } from "./types";
import { uid } from "./utils";
function makeSlide(
  title: string,
  bullets: string[] = [],
  notes = "",
  layout: Slide["layout"] = "content",
): Slide {
  return {
    id: uid("s"),
    layout,
    title,
    subtitle: "",
    bullets,
    leftBullets: [],
    rightBullets: [],
    notes,
    media: [],
    citations: [],
    theme: layout === "title" ? "classic" : "molecular",
  };
}
export function dedicatedLecture(topic: string, discipline: string) {
  return {
    course:
      profileFor(topic)?.course ||
      inferFocus(topic, discipline).discipline ||
      discipline ||
      "General Microbiology",
    courseCode: "",
  };
}
export function introSlide(topic: string, notes?: string, discipline?: string): Slide {
  const profile = profileFor(topic);
  return {
    ...makeSlide(
      topic.trim(),
      [],
      notes || `Research scope: ${profile?.scope || topic}. ${discipline || "Microbiology"}.`,
      "title",
    ),
    subtitle: profile?.scope || `Research focus: ${topic.trim()}`,
  };
}
export function withOfficialIntro(deck: Deck, input: GenerateInput): Deck {
  const topic = input.topic.trim() || deck.topic;
  const intro = introSlide(topic, input.notes, input.discipline);
  const existing = deck.slides[0]?.layout === "title";
  const slides = existing
    ? [{ ...deck.slides[0], ...intro, id: deck.slides[0].id }, ...deck.slides.slice(1)]
    : [intro, ...deck.slides];
  return {
    ...deck,
    ...lectureMeta(input),
    course: input.course?.trim() || dedicatedLecture(topic, input.discipline).course,
    courseCode: input.courseCode?.trim() || "",
    title: topic,
    topic,
    discipline: input.discipline,
    slides,
  };
}
const instruction =
  /^(name |ask |write |state |define .* in one|leave .*minutes|identify one|connect .* to|what .*\?|which .*\?|use the instructor|from the .*what)/i;
function eligible(section: TopicSection) {
  return section.bullets.length >= 2 && !section.bullets.some((b) => instruction.test(b.trim()));
}
export function generateLocalDeck(input: GenerateInput): Deck {
  const topic = input.topic.trim() || "Microbiology";
  const profile = profileFor(topic);
  const wanted = Math.min(MAX_SLIDES, Math.max(1, Math.round(input.count) || 12));
  const sections: TopicSection[] = profile
    ? [...profile.sections]
    : DISCIPLINES.flatMap((d) => d.modules)
        .filter((m) => topicOverlap(topic, `${m.title} ${m.keywords.join(" ")}`) >= 0.75)
        .filter(eligible)
        .map((m) => ({ title: m.title, bullets: m.bullets }));
  // User-supplied substantive notes are labelled as user material, never silently verified.
  if (input.notes.trim().length > 160) {
    const sentences = input.notes
      .trim()
      .split(/(?<=[.!?])\s+|\n+/)
      .filter((s) => s.trim().length > 35);
    for (let i = 0; i < sentences.length; i += 4) {
      if (sentences.slice(i, i + 4).length >= 2)
        sections.splice(i / 4, 0, {
          title: `Instructor-provided evidence${i ? ` (${i / 4 + 1})` : ""}`,
          bullets: sentences.slice(i, i + 4),
        });
    }
  }
  const unique = [
    ...new Map(sections.filter(eligible).map((s) => [s.title.toLowerCase(), s])).values(),
  ];
  const sources = profile?.sources ?? [];
  const reading = sources.length
    ? makeSlide(
        "Suggested reading",
        sources,
        "Starting sources for verification; source availability and support for each claim must still be checked.",
      )
    : null;
  const intro = introSlide(topic, undefined, input.discipline);
  const slides = [intro];
  if (wanted > 2 && unique.length) {
    slides.push(
      makeSlide(
        "Learning objectives",
        profile?.objectives ||
          unique
            .slice(0, 3)
            .map((s) => `Explain ${s.title.charAt(0).toLowerCase() + s.title.slice(1)}.`),
      ),
    );
  }
  const reserved = wanted >= 5 && unique.length >= 2 ? 2 : 0;
  const contentLimit = Math.max(0, wanted - slides.length - reserved);
  for (const s of unique.slice(0, contentLimit))
    slides.push(
      makeSlide(
        s.title,
        s.bullets,
        s.title.startsWith("Instructor-provided evidence")
          ? "User-provided material; attach original references. These claims have not been independently verified."
          : `Teaching draft for ${topic}. Source reading to verify: ${sources.join(" ") || "Attach original references; these claims require verification."}`,
      ),
    );
  if (reserved) {
    slides.push(
      makeSlide(
        "Key conclusions",
        slides
          .filter((s) => s.layout !== "title" && !/objectives/i.test(s.title))
          .slice(-3)
          .map((s) => s.bullets[0])
          .filter(Boolean),
        "Summary of claims already introduced in this deck.",
      ),
    );
    if (reading) slides.push(reading);
  }
  if (!unique.length && wanted > 1) {
    slides.push(
      makeSlide(
        "Evidence required",
        [
          "No sufficiently specific offline content is available for this topic.",
          "Add a research abstract in the generator or connect a local AI model to draft the content.",
          "The app has not substituted an unrelated lecture to meet the requested slide count.",
        ],
        "This is an explicit coverage notice, not a completed research slide.",
      ),
    );
  }
  const meta = lectureMeta(input);
  const course = input.course?.trim() || dedicatedLecture(topic, input.discipline).course;
  const warnings: string[] = [];
  if (slides.length < wanted)
    warnings.push(
      `Requested ${wanted} slides; ${slides.length} supported draft slides were available. Add source material or use AI for more coverage.`,
    );
  return {
    id: uid("deck"),
    title: topic,
    topic,
    discipline: input.discipline,
    level: input.level,
    citationStyle: "Vancouver",
    ...meta,
    course,
    courseCode: input.courseCode?.trim() || "",
    slides: slides.slice(0, wanted).map((s, i) => ({ ...s, theme: cycleTheme(i, s.layout) })),
    mediaPool: [],
    generationSource: "knowledge",
    requestedCount: wanted,
    contentWarnings: warnings,
    updatedAt: Date.now(),
  };
}
export function sampleDeck(): Deck {
  const deck = generateLocalDeck({
    topic: "Enzyme Immobilization",
    discipline: "Industrial & Biotechnology Microbiology",
    count: 12,
    level: "Undergraduate",
    notes: "",
    mode: "manual",
    course: JUW.course,
    courseCode: JUW.courseCode,
    preparedBy: JUW.preparedBy,
    department: JUW.department,
  });
  deck.id = "sample-enzyme-mic4511";
  deck.updatedAt = 1;
  deck.slides.forEach((s, i) => (s.id = `sample-s-${i}`));
  return deck;
}
