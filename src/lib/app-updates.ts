export const APP_BUILD = import.meta.env.VITE_BUILD_ID || "";
export async function checkAppBuild(): Promise<string> {
  if (!navigator.onLine) throw new Error("Offline — reconnect to check for updates.");
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
    await registration?.update();
    registration?.waiting?.postMessage("SKIP_WAITING");
  }
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
