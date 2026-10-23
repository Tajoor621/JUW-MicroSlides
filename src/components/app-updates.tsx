import { isDesktop } from "@/lib/desktop";
import { useEffect, useState } from "react";
import { APP_BUILD, checkAppBuild, refreshOfflineShell } from "@/lib/app-updates";
import { flushSavedDecks } from "@/lib/durable-storage";
import { Button } from "./ui/button";
export function AppUpdates() {
  const [latest, setLatest] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [cacheWarning, setCacheWarning] = useState(false);
  async function check() {
    setBusy(true);
    try {
      const id = await checkAppBuild();
      setLatest(id);
      setMessage(id === APP_BUILD ? "Up to date" : "A newer build is ready");
      void refreshOfflineShell().then((ok) => setCacheWarning(!ok));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update check failed.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (isDesktop()) return;
    if (!APP_BUILD) return;
    let lastCheck = 0;
    const refresh = () => {
      if (Date.now() - lastCheck > 60000) {
        lastCheck = Date.now();
        void check();
      }
    };
    refresh();
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  if (isDesktop())
    return (
      <div className="border-b border-border px-3 py-1 text-xs text-muted">
        Windows desktop · V7.0 · Build {APP_BUILD} · Local SQLite recovery
      </div>
    );
  if (!APP_BUILD) return null;
  const ready = latest && latest !== APP_BUILD;
  async function reload() {
    setBusy(true);
    try {
      await flushSavedDecks();
      const url = new URL(location.href);
      url.searchParams.set("refresh", latest);
      location.assign(url.href);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save the deck before reloading.");
      setBusy(false);
    }
  }
  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-x-3 border-b border-border px-3 text-xs text-muted"
      data-app-build={APP_BUILD}
    >
      <span className="font-mono">Build {APP_BUILD}</span>
      <span role="status" className="min-w-0 flex-1">
        {message}
        {cacheWarning &&
          " · Offline cache could not refresh. You can keep editing online; retry after reconnecting."}
      </span>
      <Button
        size="sm"
        variant={ready ? "accent" : "ghost"}
        className="min-h-11"
        disabled={busy}
        onClick={() => void (ready ? reload() : check())}
      >
        {busy ? "Checking…" : ready ? "Load latest build" : "Check for updates"}
      </Button>
    </div>
  );
}
