import { audienceFrame } from "@/lib/audience-frame";
import { useEffect, useState } from "react";
import { useDeckStore } from "@/lib/deck-store";
import { isDesktop } from "@/lib/desktop";
import { SlideView } from "./slide-view";
import { Button } from "./ui/button";
import type { Deck, Slide, CitationStyle } from "@/lib/types";
type Frame = {
  deck: Deck;
  slide: Slide;
  index: number;
  total: number;
  citationStyle: CitationStyle;
};
const CHANNEL = "juw-audience-v1";
export function AudienceView() {
  const [frame, setFrame] = useState<Frame | null>(null);
  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (e) => {
      if (e.data?.type === "frame") setFrame(e.data.frame);
    };
    channel.postMessage({ type: "ready" });
    const key = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowLeft", " ", "Escape"].includes(e.key)) {
        e.preventDefault();
        channel.postMessage({ type: "control", key: e.key });
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      channel.close();
      window.removeEventListener("keydown", key);
    };
  }, []);
  return (
    <main className="flex h-screen w-screen items-center justify-center bg-bg">
      {frame ? (
        <div className="w-full max-h-screen" style={{ maxWidth: "177.777vh" }}>
          <SlideView {...frame} present />
        </div>
      ) : (
        <p className="text-fg">Waiting for the lecturer…</p>
      )}
    </main>
  );
}
export function DesktopPresenter() {
  const deck = useDeckStore((s) => s.deck()),
    index = useDeckStore((s) => s.selectedIndex),
    style = useDeckStore((s) => s.citationStyle);
  const [monitors, setMonitors] = useState<
      {
        name: string | null;
        position: { x: number; y: number };
        size: { width: number; height: number };
      }[]
    >([]),
    [monitor, setMonitor] = useState(0),
    [error, setError] = useState(""),
    [started] = useState(Date.now()),
    [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!isDesktop()) return;
    void import("@tauri-apps/api/window")
      .then(async (m) => setMonitors(await m.availableMonitors()))
      .catch((e) => setError(String(e)));
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [started]);
  useEffect(() => {
    if (!deck) return;
    const ch = new BroadcastChannel(CHANNEL);
    const send = () => {
      ch.postMessage({ type: "frame", frame: audienceFrame(deck, index, style) });
    };
    ch.onmessage = (e) => {
      if (e.data?.type === "ready") send();
      if (e.data?.type === "control") {
        if (e.data.key === "Escape") useDeckStore.getState().setPresenting(false);
        else useDeckStore.getState().select(index + (e.data.key === "ArrowLeft" ? -1 : 1));
      }
    };
    send();
    return () => ch.close();
  }, [deck, index, style]);
  useEffect(
    () => () => {
      void import("@tauri-apps/api/webviewWindow").then(async (m) => {
        await (await m.WebviewWindow.getByLabel("audience"))?.close();
      });
    },
    [],
  );
  if (!deck) return null;
  async function openAudience() {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      let window = await WebviewWindow.getByLabel("audience");
      if (!window) {
        window = new WebviewWindow("audience", {
          url: "index.html?audience=1",
          title: "JUW lecture",
          width: 1280,
          height: 720,
        });
        await new Promise<void>((resolve, reject) => {
          window!.once("tauri://created", () => resolve());
          window!.once("tauri://error", (e) => reject(e.payload));
        });
      }
      const target = monitors[monitor];
      if (target) {
        const { PhysicalPosition, PhysicalSize } = await import("@tauri-apps/api/dpi");
        await window.setPosition(new PhysicalPosition(target.position.x, target.position.y));
        await window.setSize(new PhysicalSize(target.size.width, target.size.height));
      }
      await window.setFullscreen(true);
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <div className="fixed inset-0 z-[80] flex flex-col gap-3 overflow-auto bg-bg p-6 text-fg">
      <div className="flex flex-wrap items-center gap-3">
        <h2>Private presenter console</h2>
        <span>
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </span>
        <label>
          Audience screen
          <select
            aria-label="Audience screen"
            className="ml-2 rounded border bg-elevated p-2"
            value={monitor}
            onChange={(e) => setMonitor(Number(e.target.value))}
          >
            {monitors.map((m, i) => (
              <option key={i} value={i}>
                {m.name || `Monitor ${i + 1}`} · {m.size.width}×{m.size.height}
              </option>
            ))}
          </select>
        </label>
        <Button onClick={() => void openAudience()}>Open audience display</Button>
        <Button onClick={() => useDeckStore.getState().setPresenting(false)}>
          Exit presentation
        </Button>
      </div>
      {error && (
        <p role="alert">{error}. Choose an available screen and retry; your project is safe.</p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p>
            Current · {index + 1}/{deck.slides.length}
          </p>
          <SlideView
            slide={deck.slides[index]}
            deck={deck}
            index={index}
            total={deck.slides.length}
            citationStyle={style}
          />
        </div>
        {deck.slides[index + 1] && (
          <div>
            <p>Next</p>
            <SlideView
              slide={deck.slides[index + 1]}
              deck={deck}
              index={index + 1}
              total={deck.slides.length}
              citationStyle={style}
            />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => useDeckStore.getState().select(index - 1)}>Previous</Button>
        <Button onClick={() => useDeckStore.getState().select(index + 1)}>Next</Button>
      </div>
      <p className="whitespace-pre-wrap">{deck.slides[index].notes}</p>
    </div>
  );
}
