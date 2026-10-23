import { lectureSlideSchema } from "@/lib/lecture-schema";
import { useState } from "react";
import { useDeckStore } from "@/lib/deck-store";
import { courseProblem, orderedCourse } from "@/lib/course-builder";
import { blankLectureSlide } from "@/lib/lecture-modes";
import { Button } from "./ui/button";
import { toast } from "sonner";
export function CourseBuilder() {
  const deck = useDeckStore((s) => s.deck()),
    library = useDeckStore((s) => s.library);
  const [name, setName] = useState("");
  if (!deck) return null;
  const courses = [
    ...new Map(
      library.flatMap((d) =>
        d.courseSeries ? [[d.courseSeries.id, d.courseSeries.title] as const] : [],
      ),
    ).entries(),
  ];
  const series = deck.courseSeries,
    lectures = series ? orderedCourse(library, series.id) : [];
  function join(id: string, title: string) {
    useDeckStore.getState().patchDeck({
      courseSeries: {
        id,
        title,
        order: orderedCourse(library, id).length + 1,
        prerequisites: [],
      },
    });
  }
  return (
    <details className="rounded border border-border p-3">
      <summary className="cursor-pointer text-sm">Course Builder</summary>
      <div className="mt-2 space-y-3">
        <label className="block text-xs">
          Course series
          <select
            className="min-h-11 w-full rounded border bg-elevated p-2"
            value={series?.id || ""}
            onChange={(e) => {
              const course = courses.find(([id]) => id === e.target.value);
              if (course) join(...course);
              else useDeckStore.getState().patchDeck({ courseSeries: undefined });
            }}
          >
            <option value="">Standalone lecture</option>
            {courses.map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs">
          New course name
          <input
            className="min-h-11 w-full rounded border bg-elevated p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
          />
        </label>
        <Button
          size="sm"
          disabled={!name.trim()}
          onClick={() => {
            join(crypto.randomUUID(), name.trim());
            setName("");
          }}
        >
          Create series & add this lecture
        </Button>
        {series && (
          <>
            <label className="block text-xs">
              Lecture order
              <input
                className="min-h-11 rounded border bg-elevated p-2"
                type="number"
                min={1}
                max={100}
                value={series.order}
                onChange={(e) => {
                  const order = Number(e.target.value);
                  if (Number.isInteger(order) && order >= 1 && order <= 100)
                    useDeckStore.getState().patchDeck({ courseSeries: { ...series, order } });
                }}
              />
            </label>
            <fieldset>
              <legend className="text-xs">Prerequisite lectures</legend>
              {library
                .filter((d) => d.id !== deck.id)
                .map((d) => (
                  <label className="flex min-h-11 items-center gap-2 text-xs" key={d.id}>
                    <input
                      type="checkbox"
                      checked={series.prerequisites.includes(d.id)}
                      onChange={(e) => {
                        const prerequisites = e.target.checked
                          ? [...series.prerequisites, d.id]
                          : series.prerequisites.filter((id) => id !== d.id);
                        const problem = courseProblem(library, deck.id, prerequisites);
                        if (problem) toast.error(problem);
                        else
                          useDeckStore
                            .getState()
                            .patchDeck({ courseSeries: { ...series, prerequisites } });
                      }}
                    />
                    {d.title}
                  </label>
                ))}
            </fieldset>
            <ol className="text-xs">
              {lectures.map((d) => (
                <li key={d.id}>
                  {d.courseSeries!.order}. {d.title}
                </li>
              ))}
            </ol>
            <Button
              size="sm"
              onClick={() => {
                const state = useDeckStore.getState();
                if (state.selectedIndex === 0 && deck.slides.length > 1) {
                  toast.message(
                    "Select a content slide to replace with the course overview. The introduction and exact slide count are preserved.",
                  );
                  return;
                }
                const entries = lectures.map((d) => `${d.courseSeries!.order}. ${d.title}`);
                const groupSize = Math.max(1, Math.ceil(entries.length / 6));
                const objectives = Array.from(
                  { length: Math.ceil(entries.length / groupSize) },
                  (_, i) => entries.slice(i * groupSize, (i + 1) * groupSize).join("; "),
                );
                state.patchSlide(state.selectedIndex, {
                  ...Object.fromEntries(
                    Object.keys(lectureSlideSchema.shape).map((key) => [key, undefined]),
                  ),
                  ...blankLectureSlide("Course overview & prerequisites", "learning-objectives"),
                  teaching: undefined,
                  claims: [],
                  surfaceReviews: [],
                  learningObjectives: objectives,
                  bullets: objectives,
                  notes: lectures
                    .map(
                      (d) =>
                        `${d.title}\nPrerequisites: ${d.courseSeries!.prerequisites.map((id) => library.find((x) => x.id === id)?.title || id).join(", ") || "None specified"}`,
                    )
                    .join("\n\n"),
                });
              }}
            >
              Replace selected slide with course overview
            </Button>
          </>
        )}
      </div>
    </details>
  );
}
