import { createRoot } from "react-dom/client";
import { EditorApp } from "./components/editor-app";
import { PreviewHostBridge } from "./components/preview-host-bridge";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <>
    <PreviewHostBridge />
    <EditorApp />
  </>,
);
if ("serviceWorker" in navigator) {
  const register = () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: "none",
      })
      .then(async (registration) => {
        registration.waiting?.postMessage("SKIP_WAITING");
        await registration.update();
      })
      .catch(() => console.warn("Offline installation failed; reconnect and reload to retry."));
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
