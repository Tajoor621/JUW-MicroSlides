import { useState } from "react";
import { toast } from "sonner";
import { localAiConfig, validateLocalAiUrl } from "@/lib/local-ai";
import { Button } from "./ui/button";
export function LocalAiSettings() {
  const config = localAiConfig();
  const [url, setUrl] = useState(config?.url || "http://localhost:11434");
  const [model, setModel] = useState(config?.model || "llama3.2");
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
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            try {
              if (!model.trim() || model.length > 100)
                throw new Error("Enter an installed model name (maximum 100 characters).");
              localStorage.setItem(
                "juw-local-ai",
                JSON.stringify({ url: validateLocalAiUrl(url), model: model.trim() }),
              );
              toast.success("Local AI configured. Select AI mode to generate.");
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
            toast.message("Local AI disconnected.");
          }}
        >
          Disconnect
        </Button>
      </div>
    </section>
  );
}
