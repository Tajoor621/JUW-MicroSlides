// Per-request budgets, independent of the application version and research budget.
export const LOCAL_AI_JSON_BUDGET_MS = 180_000;
export const LOCAL_AI_CHAT_BUDGET_MS = 55_000;
/** Respect advertised controls; older servers and models without metadata keep their default. */
export function jsonThinkingPreference(metadata: unknown): false | "low" | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const thinking = (metadata as { thinking?: { values?: unknown } }).thinking;
  const values = thinking?.values;
  if (!Array.isArray(values)) return undefined;
  if (values.includes(false)) return false;
  return values.includes("low") ? "low" : undefined;
}
