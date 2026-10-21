export const APP_BUILD = import.meta.env.VITE_BUILD_ID || "";
export async function checkAppBuild(): Promise<string> {
  if (!navigator.onLine) throw new Error("Offline — reconnect to check for updates.");
  const response = await fetch(`${import.meta.env.BASE_URL}build-info.json`, {
    cache: "no-store",
    credentials: "omit",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("The update check is temporarily unavailable.");
  const result = await response.json();
  if (typeof result.buildId !== "string" || !/^[a-z0-9-]{1,40}$/i.test(result.buildId))
    throw new Error("Invalid build metadata.");
  return result.buildId;
}

/** Cache maintenance must never prevent discovery of a published build. A
 * registration can become redundant between lookup and update (InvalidStateError).
 * Keep saved decks and the last working offline shell intact when that happens. */
export async function refreshOfflineShell(timeoutMs = 5000): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !navigator.onLine) return true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const registration = await navigator.serviceWorker.getRegistration(
          import.meta.env.BASE_URL,
        );
        if (!registration) return true; // Initial registration is owned by pages-entry.
        if (registration.installing) return true; // Let the current install finish.
        if (!registration.active && !registration.waiting) return false;
        await registration.update();
        registration.waiting?.postMessage("SKIP_WAITING");
        return true;
      })().catch(() => false),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
