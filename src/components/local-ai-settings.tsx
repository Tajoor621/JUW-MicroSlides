import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { localAiConfig, validateLocalAiUrl, probeLocalAi } from "@/lib/local-ai";
import { Button } from "./ui/button";
export function LocalAiSettings() {
  const config = localAiConfig();
  const [url, setUrl] = useState(config?.url || "http://localhost:11434");
  const [model, setModel] = useState(config?.model || "llama3.2");
  const [embeddingModel, setEmbeddingModel] = useState(config?.embeddingModel || "");
  const [status, setStatus] = useState("");
  const [checking, setChecking] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    request.current?.abort();
    setChecking(false);
    setStatus("");
    return () => request.current?.abort();
  }, [url, model, embeddingModel]);
  async function testConnection() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setChecking(true);
    setStatus("Checking server and installed model names…");
    try {
      const result = await probeLocalAi({ url, model, embeddingModel }, controller.signal);
      if (controller.signal.aborted) return;
      setStatus(
        `${result.generationReady ? "Server reachable; generation model found." : "Server reachable, but the generation model is missing."} ${embeddingModel.trim() ? (result.embeddingReady ? "Embedding model found." : "Embedding model is missing; semantic screening is unavailable.") : "No embedding model selected; semantic screening is unavailable."} This checks availability, not scientific accuracy or image capability. Save settings to use this configuration.`,
      );
    } catch (error) {
      if (!controller.signal.aborted)
        setStatus(
          `Connection failed. ${error instanceof Error ? error.message : "Server unavailable."} Ensure Ollama is running and browser access is allowed. Knowledge mode remains available.`,
        );
    } finally {
      if (request.current === controller) setChecking(false);
    }
  }
  return (
    <section className="space-y-2 rounded border border-border p-3">
      <h3 className="text-sm font-medium">Optional local AI (Ollama)</h3>
      <p className="text-xs text-muted">
        Requires your own running Ollama server and installed model. On a phone, localhost means the
        phone; use your computer’s private LAN address. Browser security or server CORS settings may
        block access. No cloud key is needed.
      </p>
      <label className="block text-xs">
        Server address
        <input
          aria-label="Local AI server"
          className="block w-full rounded border border-border bg-elevated p-2"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <label className="block text-xs">
        Installed model
        <input
          aria-label="Local AI model"
          className="block w-full rounded border border-border bg-elevated p-2"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
      </label>
      <label className="block text-xs">
        Installed embedding model (optional semantic review)
        <input
          aria-label="Embedding model"
          className="block w-full rounded border border-border bg-elevated p-2"
          value={embeddingModel}
          onChange={(e) => setEmbeddingModel(e.target.value)}
          maxLength={100}
          placeholder="e.g. embeddinggemma"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={checking}
          onClick={() => void testConnection()}
        >
          {checking ? "Checking connection…" : "Test local AI connection"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            try {
              if (!model.trim() || model.length > 100)
                throw new Error("Enter an installed model name (maximum 100 characters).");
              localStorage.setItem(
                "juw-local-ai",
                JSON.stringify({
                  url: validateLocalAiUrl(url),
                  model: model.trim(),
                  embeddingModel: embeddingModel.trim(),
                }),
              );
              toast.success("Local AI settings saved. Test the connection before generating.");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Invalid settings");
            }
          }}
        >
          Save local AI
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            localStorage.removeItem("juw-local-ai");
            request.current?.abort();
            setChecking(false);
            setStatus("Local AI disconnected. Knowledge mode remains available.");
            toast.message("Local AI disconnected.");
          }}
        >
          Disconnect
        </Button>
      </div>
      {status && (
        <p role="status" className="text-xs leading-relaxed text-muted">
          {status}
        </p>
      )}
    </section>
  );
}
