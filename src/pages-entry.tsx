import { isDesktop } from "./lib/desktop";
import { AudienceView } from "./components/desktop-presenter";
import { createRoot } from "react-dom/client";
import { EditorApp } from "./components/editor-app";
import { PreviewHostBridge } from "./components/preview-host-bridge";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <>
    <PreviewHostBridge />
    {new URLSearchParams(location.search).has("audience") ? <AudienceView /> : <EditorApp />}
  </>,
);
if (!isDesktop() && "serviceWorker" in navigator) {
  const register = () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: "none",
      })
      .then((registration) => {
        registration.waiting?.postMessage("SKIP_WAITING");
        // register() already checks for an update. A second immediate update can
        // race with installation/activation on mobile browsers.
      })
      .catch(() => console.warn("Offline installation failed; reconnect and reload to retry."));
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
