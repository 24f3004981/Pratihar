import { GoogleGenAI, ThinkingLevel, type Content, type FunctionDeclaration, type GenerateContentConfig, type GenerateContentResponse } from "@google/genai";
import type { ZodType, ZodTypeDef } from "zod";
import { env, need } from "./env";

// Extraction, judging and phone replies need speed more than deep reasoning; a caller won't wait 60 seconds.
const FAST = { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } };

// If the chosen model is slow, busy or retired, these are hedged in this order. All answered
// a receptionist-style prompt when timed (scripts/time-models.ts); quotas and load change daily.
const FALLBACKS = ["gemini-3-flash-preview", "gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.7-flash"];

let client: GoogleGenAI | null = null;
export function gemini(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: need(env.geminiKey, "GEMINI_API_KEY") });
  return client;
}

export class AiBusy extends Error {
  status = 503;
}

const statusOf = (e: unknown) => {
  const m = /"code"\s*:\s*(\d{3})/.exec((e as Error)?.message ?? "");
  return (e as { status?: number })?.status ?? (m ? Number(m[1]) : 0);
};

// A model that just said "busy" or "quota" is skipped for a while instead of being retried on
// every request; a caller on the line shouldn't pay for the same refusal ten times.
const coolUntil = new Map<string, number>();

/**
 * generateContent with hedging: start the first ready model, and if it hasn't answered in
 * HEDGE_MS (or it refuses), start the next one too. The first good answer wins. Models that
 * refuse with 429/503/404 cool down so later requests skip them.
 */
const HEDGE_MS = 3500;
const MAX_MS = 20000;
async function generate(contents: Content[] | string, config: GenerateContentConfig): Promise<GenerateContentResponse> {
  const all = [env.geminiModel, ...FALLBACKS.filter((m) => m !== env.geminiModel)];
  const now = Date.now();
  const ready = all.filter((m) => (coolUntil.get(m) ?? 0) < now);
  const models = ready.length ? ready : all;
  const stop = new AbortController();
  let last: unknown;
  return new Promise<GenerateContentResponse>((resolve, reject) => {
    let next = 0, running = 0, done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => { done = true; clearTimeout(timer); stop.abort(); };
    const launch = () => {
      if (done) return;
      clearTimeout(timer);
      if (next >= models.length) {
        if (!running) { finish(); console.warn("[gemini] every model busy:", (last as Error)?.message?.slice(0, 160)); reject(new AiBusy("Pratihar's AI is busy right now. Please try again in a minute.")); }
        return;
      }
      const model = models[next++];
      running++;
      timer = setTimeout(launch, HEDGE_MS);
      const signal = AbortSignal.any([stop.signal, AbortSignal.timeout(MAX_MS)]);
      gemini().models.generateContent({ model, contents, config: { ...FAST, abortSignal: signal, ...config } }).then(
        (r) => { running--; if (!done) { finish(); resolve(r); } },
        (e) => {
          running--;
          if (done) return;
          last = e;
          const timedOut = (e as Error)?.name === "AbortError" || (e as Error)?.name === "TimeoutError";
          const s = timedOut ? 503 : statusOf(e);
          if (![404, 429, 500, 503].includes(s)) { finish(); reject(e); return; }
          if (!timedOut) coolUntil.set(model, Date.now() + (s === 404 ? 3_600_000 : s === 429 ? 600_000 : 30_000));
          console.warn(`[gemini] ${model} returned ${s}; trying the next model`);
          launch();
        },
      );
    };
    launch();
  });
}

function stripFence(s: string) {
  return s.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
}

/**
 * Ask Gemini for JSON and validate it with zod. One retry, with the validation error
 * fed back, covers most of the "almost valid" answers models give.
 */
export async function askJson<T>(opts: {
  system: string;
  prompt: string;
  schema: ZodType<T, ZodTypeDef, unknown>;
  temperature?: number;
}): Promise<T> {
  let prompt = opts.prompt;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await generate(prompt, {
      systemInstruction: opts.system,
      responseMimeType: "application/json",
      temperature: opts.temperature ?? 0.2,
    });
    const raw = stripFence(res.text ?? "");
    try {
      const parsed = opts.schema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
      prompt = `${opts.prompt}\n\nYour last answer failed validation: ${parsed.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}. Return corrected JSON only.`;
    } catch {
      prompt = `${opts.prompt}\n\nYour last answer was not valid JSON. Return JSON only.`;
    }
  }
  throw new Error("Gemini did not return valid JSON after a retry.");
}

export async function askText(system: string, contents: Content[] | string, temperature = 0.6) {
  const res = await generate(contents, { systemInstruction: system, temperature });
  return (res.text ?? "").trim();
}

export async function step(system: string, contents: Content[], tools: FunctionDeclaration[]) {
  const res = await generate(contents, { systemInstruction: system, temperature: 0.4, tools: [{ functionDeclarations: tools }] });
  return {
    text: (res.text ?? "").trim(),
    calls: res.functionCalls ?? [],
    content: res.candidates?.[0]?.content,
  };
}
