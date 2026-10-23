import { useDeckStore } from "@/lib/deck-store";
import { teachingOf } from "@/lib/teaching";
import { Button } from "./ui/button";
const diagrams = [
  ["gram-wall", "Gram cell wall"],
  ["viral-cycle", "Viral replication cycle"],
  ["biofilm-stages", "Biofilm stages"],
  ["one-health", "One Health transmission"],
  ["conjugation", "Conjugation"],
] as const;
export function ScientificDiagramTools() {
  const slide = useDeckStore((s) => s.slide());
  if (!slide || slide.layout === "title") return null;
  return (
    <details className="rounded border border-border p-3">
      <summary className="cursor-pointer text-sm">Generate scientific diagram</summary>
      <p className="my-2 text-xs text-muted">
        Original local SVG templates. Inspect species-specific meaning and add supporting references
        before teaching.
      </p>
      <div className="flex flex-wrap gap-2">
        {diagrams.map(([kind, label]) => (
          <Button
            key={kind}
            size="sm"
            variant="secondary"
            onClick={() => {
              const state = useDeckStore.getState(),
                s = state.slide();
              if (!s) return;
              state.patchSlide(state.selectedIndex, {
                mediaTags: ["schematic"],
                evidenceFlags: [
                  ...new Set([...(s.evidenceFlags || []), "needs-verification" as const]),
                ],
                teaching: {
                  ...teachingOf(s),
                  diagram: kind,
                  diagramLabel: label,
                  altText: `Conceptual ${label.toLowerCase()}; not to scale.`,
                  labels: [],
                  scaleBar: undefined,
                  legend:
                    "Original JUW-MicroSlides conceptual template · CC0 · inspect before teaching",
                },
              });
            }}
          >
            {label}
          </Button>
        ))}
      </div>
    </details>
  );
}
