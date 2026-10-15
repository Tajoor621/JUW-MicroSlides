import { z } from "zod";
import type { GenerateInput, Slide } from "./types";
import { generateLocalDeck } from "./generate-deck";
import { uid } from "./utils";
import { cycleTheme } from "./slide-themes";
export function localAiConfig() {
  try {
    return JSON.parse(localStorage.getItem("juw-local-ai") || "null") as {
      url: string;
      model: string;
    } | null;
  } catch {
    return null;
  }
}
export function validateLocalAiUrl(raw: string) {
  const u = new URL(raw);
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password || u.search || u.hash)
    throw new Error("Use an HTTP(S) server address without credentials, query, or fragment.");
  const h = u.hostname;
  if (!(
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "[::1]" ||
    /^192\.168\.\d+\.\d+$/.test(h) ||
    /^10\.\d+\.\d+\.\d+$/.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(h)
  ))
    throw new Error("Use your own local computer's localhost or private LAN address.");
  return u.origin;
}
async function chat(prompt: string, json = false) {
  const config = localAiConfig();
  if (!config)
    throw new Error(
      "Local AI is not configured. Open Settings to configure your own Ollama server, or use Knowledge mode.",
    );
  const response = await fetch(`${validateLocalAiUrl(config.url)}/api/chat`, {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(55000),
    body: JSON.stringify({
      model: config.model,
      stream: false,
      ...(json ? { format: "json" } : {}),
      messages: [{ role: "user", content: prompt }],
      options: { num_predict: 6000, temperature: 0.3 },
    }),
  });
  if (!response.ok)
    throw new Error(
      `Local AI returned ${response.status}. Check the server, installed model, and browser access settings.`,
    );
  const body = await response.json();
  if (typeof body.message?.content !== "string")
    throw new Error("Local AI returned an unreadable response.");
  return body.message.content as string;
}
const generatedSlide = z.object({
  layout: z.enum(["title", "content", "two-column", "full-image", "blank"]).default("content"),
  title: z.string().min(1).max(1000),
  subtitle: z.string().max(2000).default(""),
  bullets: z.array(z.string().max(3000)).max(12).default([]),
  leftBullets: z.array(z.string().max(3000)).max(12).default([]),
  rightBullets: z.array(z.string().max(3000)).max(12).default([]),
  notes: z.string().max(10000).default(""),
});
export async function generateLocalAiDeck(input: GenerateInput) {
  if (input.count > 36)
    throw new Error(
      "Local AI supports at most 36 slides per request. Choose 36 or fewer, or use Knowledge mode.",
    );
  const raw = await chat(
    `Create exactly ${input.count} microbiology lecture slides about ${input.topic}. Level: ${input.level}. Instructor guidance: ${input.notes}. Return JSON {title:string,slides:[{layout:"title"|"content"|"two-column",title:string,subtitle:string,bullets:string[],leftBullets:string[],rightBullets:string[],notes:string}]}. First slide is title. Include objectives and a summary. Do not invent citations, DOIs, experimental data, or claim that sources were verified. Flag uncertainties in notes.`,
    true,
  );
  const json = z
    .object({ title: z.string().max(1000), slides: z.array(generatedSlide).min(1).max(36) })
    .parse(JSON.parse(raw));
  if (json.slides.length !== input.count)
    throw new Error(
      `Local AI returned ${json.slides.length} slides instead of ${input.count}; retry or use Knowledge mode.`,
    );
  const deck = generateLocalDeck(input);
  const slides: Slide[] = json.slides.map((s, i) => ({
    ...s,
    id: uid("s"),
    theme: cycleTheme(i, s.layout),
    media: [],
    citations: [],
  }));
  return { ...deck, title: json.title, slides, generationSource: "local-ai" as const };
}
export async function localCopilot(data: {
  question: string;
  slideTitle: string;
  slideBody: string;
  refine: boolean;
}) {
  return chat(
    `You help draft microbiology slides. Do not invent sources. Flag uncertainty. Title: ${data.slideTitle}\nContent: ${data.slideBody}\nRequest: ${data.question || "Improve clarity"}\n${data.refine ? "Return JSON {title:string,bullets:string[],notes:string}." : "Return concise plain text."}`,
    data.refine,
  );
}
