import { useDeckStore } from "./deck-store";
import type { Deck } from "./types";
type Snapshot = { library: Deck[]; activeId: string | null; selectedIndex: number };
const past: Snapshot[] = [],
  future: Snapshot[] = [];
let replay = false;
const pick = (s: Snapshot): Snapshot => ({
  library: s.library,
  activeId: s.activeId,
  selectedIndex: s.selectedIndex,
});
useDeckStore.subscribe((state, previous) => {
  if (replay || !useDeckStore.persist.hasHydrated() || state.library === previous.library) return;
  past.push(pick(previous));
  if (past.length > 20) past.shift();
  future.length = 0;
});
function restore(from: Snapshot[], to: Snapshot[]) {
  const snapshot = from.pop();
  if (!snapshot) return;
  to.push(pick(useDeckStore.getState()));
  replay = true;
  useDeckStore.setState(snapshot);
  replay = false;
}
export function undo() {
  restore(past, future);
}
export function redo() {
  restore(future, past);
}
