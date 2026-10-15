const windows = new Map<string, { start: number; count: number }>();
export function reserveAiRequest(kind: "deck" | "copilot", now = Date.now()) {
  const limit = kind === "deck" ? 6 : 30;
  let window = windows.get(kind);
  if (!window || now - window.start >= 60000) {
    window = { start: now, count: 0 };
    windows.set(kind, window);
  }
  if (window.count >= limit) return false;
  window.count++;
  return true;
}
