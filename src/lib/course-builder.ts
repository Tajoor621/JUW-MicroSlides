import type { Deck } from "./types";
import { uid } from "./utils";
export function restoredDeckCopies(decks: Deck[]) {
  const ids = new Map(decks.map((d) => [d.id, uid("restored")]));
  const courses = new Map(
    decks.flatMap((d) => (d.courseSeries ? [[d.courseSeries.id, uid("course-copy")]] : [])),
  );
  return decks.map((d) => ({
    ...d,
    id: ids.get(d.id)!,
    updatedAt: Date.now(),
    courseSeries: d.courseSeries
      ? {
          ...d.courseSeries,
          id: courses.get(d.courseSeries.id)!,
          prerequisites: d.courseSeries.prerequisites.map((id) => ids.get(id) || id),
        }
      : undefined,
  }));
}
export function courseProblem(library: Deck[], deckId: string, prerequisites: string[]) {
  if (prerequisites.includes(deckId)) return "A lecture cannot require itself.";
  if (prerequisites.some((id) => !library.some((d) => d.id === id)))
    return "A prerequisite lecture is missing from this library.";
  const graph = new Map(
    library.map((d) => [
      d.id,
      d.id === deckId ? prerequisites : d.courseSeries?.prerequisites || [],
    ]),
  );
  const visiting = new Set<string>(),
    done = new Set<string>();
  function cycle(id: string): boolean {
    if (visiting.has(id)) return true;
    if (done.has(id)) return false;
    visiting.add(id);
    if ((graph.get(id) || []).some(cycle)) return true;
    visiting.delete(id);
    done.add(id);
    return false;
  }
  return cycle(deckId) ? "Prerequisites form a cycle. Remove the circular dependency." : "";
}
export function orderedCourse(library: Deck[], id: string) {
  return library
    .filter((d) => d.courseSeries?.id === id)
    .sort(
      (a, b) => a.courseSeries!.order - b.courseSeries!.order || a.title.localeCompare(b.title),
    );
}
