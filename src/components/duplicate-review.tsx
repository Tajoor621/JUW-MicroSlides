import { duplicateStatements, slideStatements, statementSimilarity } from "@/lib/deck-integrity";
import { useDeckStore } from "@/lib/deck-store";
import { Button } from "./ui/button";

export function DuplicateReview() {
  const deck = useDeckStore((s) => s.deck());
  if (!deck) return null;
  const pairs = duplicateStatements(deck.slides);
  if (!pairs.length) return null;
  return (
    <section
      aria-label="Overlapping teaching points"
      className="space-y-3 rounded border border-accent p-3"
    >
      <h3 className="text-sm font-semibold">Repair overlapping teaching points</h3>
      <p className="text-xs text-muted">
        Compare the source contexts. Similar wording can describe different findings; never delete
        it solely because a screening rule flagged it.
      </p>
      {pairs.slice(0, 20).map((pair, n) => {
        const first = deck.slides[pair.first],
          second = deck.slides[pair.second];
        const original = slideStatements(first).find((line) => line === pair.quote);
        const removable =
          Boolean(original) &&
          slideStatements(second).filter((line) => line !== pair.quote).length > 0 &&
          !second.locked;
        return (
          <div key={n} className="space-y-2 border-t border-border pt-3 text-xs">
            <p className="font-semibold">
              Slides {pair.first + 1} and {pair.second + 1}
            </p>
            <blockquote className="break-words border-l-2 border-border pl-2">
              {slideStatements(first).find((line) => statementSimilarity(line, pair.quote) >= 0.86)}
            </blockquote>
            <blockquote className="break-words border-l-2 border-accent pl-2">
              {pair.quote}
            </blockquote>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => useDeckStore.getState().select(pair.first)}
              >
                Compare slide {pair.first + 1}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  useDeckStore.getState().select(pair.second);
                  useDeckStore.getState().setTab("edit");
                }}
              >
                Edit slide {pair.second + 1}
              </Button>
              {removable && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const state = useDeckStore.getState(),
                      live = state.deck();
                    if (!live || live !== deck || second.locked) return;
                    let removed = false;
                    const keep = (x: string) => {
                      if (!removed && x === pair.quote) {
                        removed = true;
                        return false;
                      }
                      return true;
                    };
                    state.patchSlide(pair.second, {
                      bullets: second.bullets.filter(keep),
                      leftBullets: second.leftBullets.filter(keep),
                      rightBullets: second.rightBullets.filter(keep),
                    });
                  }}
                >
                  Remove exact repeated point from slide {pair.second + 1}
                </Button>
              )}
            </div>
          </div>
        );
      })}
      {pairs.length > 20 && (
        <p className="text-xs text-muted">
          Showing 20 of {pairs.length} overlaps. All remain in the full review report.
        </p>
      )}
      <p className="text-xs text-muted">
        Removal preserves the slide, notes and references. Undo restores the previous content. Empty
        or near-matching points require editing.
      </p>
    </section>
  );
}
