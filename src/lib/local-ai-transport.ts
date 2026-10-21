import { isDesktop, nativeCall } from "./desktop";
// Native requests bypass renderer connect-src only through a bounded, local-only bridge.
// The Rust boundary independently validates the host, endpoint, body and response size.
export async function localAiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (!isDesktop()) return fetch(url, options);
  const signal = options.signal;
  signal?.throwIfAborted();
  const id = crypto.randomUUID();
  const cancel = () => {
    void nativeCall("cancel_local_ai", { id }).catch(() => {});
  };
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    const text = await nativeCall<string>("local_ai_request", {
      id,
      url,
      body: typeof options.body === "string" ? options.body : null,
    });
    signal?.throwIfAborted();
    return new Response(text, { status: 200, headers: { "content-type": "application/json" } });
  } catch (error) {
    signal?.throwIfAborted();
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    signal?.removeEventListener("abort", cancel);
  }
}
