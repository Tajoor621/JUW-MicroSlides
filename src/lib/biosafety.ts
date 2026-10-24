import type { Deck, GenerateInput } from "./types";
// Screening signals, not an exhaustive agent classification or containment assignment.
const highContainment =
  /\b(?:BSL[ -]?[34]|RG[ -]?[34]|high[- ]containment|maximum[- ]containment|Ebola|Marburg|Nipah|Hendra|Variola|Bacillus anthracis|Yersinia pestis|Francisella tularensis|Brucella|Coxiella burnetii|Burkholderia pseudomallei|Mycobacterium tuberculosis)\b/i;
const operational =
  /\b(?:cult(?:ure|uring|ivation)|propagat\w*|grow(?:th|ing)?|isolat\w*|inoculat\w*|incubat\w*|aerosoli[sz]\w*|protocol|step[- ]by[- ]step)\b/i;
export const BIOSAFETY_PROMPT =
  "For high-containment or high-consequence agents, provide non-operational educational discussion only. Do not supply culture, propagation, isolation, optimization or exposure procedures, exact operating parameters or stepwise handling. Do not assign containment from a name alone; local institutional risk assessment is required.";
export function protocolSafetyProblem(
  input: Pick<GenerateInput, "topic" | "notes" | "generationMode">,
) {
  const context = `${input.topic}\n${input.notes}`;
  return highContainment.test(context) &&
    (input.generationMode === "laboratory" || operational.test(input.topic))
    ? "This request may involve high-containment procedural work. Choose a non-operational standard lecture or pathogen profile. Use institution-approved procedures and a qualified local biosafety review for practical work. Your saved deck is preserved."
    : null;
}
export function assertGenerationBiosafety(
  input: Pick<GenerateInput, "topic" | "notes" | "generationMode">,
) {
  const problem = protocolSafetyProblem(input);
  if (problem) throw Error(problem);
}
export function assertGeneratedBiosafety(deck: Deck) {
  if (
    highContainment.test(`${deck.topic}\n${deck.title}`) &&
    deck.slides.some((s) => s.protocol?.steps.length || s.layout === "lab-protocol")
  )
    throw Error(
      "Generated high-containment protocol detail was withheld. Request a non-operational teaching overview; the saved deck is preserved.",
    );
  return deck;
}
