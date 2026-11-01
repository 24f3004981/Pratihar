import { GoogleGenAI, ThinkingLevel, type Content, type FunctionDeclaration, type GenerateContentConfig, type GenerateContentResponse } from "@google/genai";
import type { ZodType, ZodTypeDef } from "zod";
import { env, need } from "./env";

// Extraction, judging and phone replies need speed more than deep reasoning; a caller won't wait 60 seconds.
const FAST = { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } };

// If the chosen model is busy or retired, try these in order. All are on the key's model list and
// answered a receptionist-style prompt in under 3 s when timed (scripts/time-models.ts).
const FALLBACKS = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite"];

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

/** generateContent on the first model that isn't cooling down; on 429/500/503/404 move to the next. */
async function generate(contents: Content[] | string, config: GenerateContentConfig): Promise<GenerateContentResponse> {
  const all = [env.geminiModel, ...FALLBACKS.filter((m) => m !== env.geminiModel)];
  const now = Date.now();
  const ready = all.filter((m) => (coolUntil.get(m) ?? 0) < now);
  const models = ready.length ? ready : all;
  let last: unknown;
  for (const model of models) {
    try {
      return await gemini().models.generateContent({ model, contents, config: { ...FAST, ...config } });
    } catch (e) {
      last = e;
      const s = statusOf(e);
      if (![404, 429, 500, 503].includes(s)) throw e;
      coolUntil.set(model, Date.now() + (s === 404 ? 3_600_000 : s === 429 ? 60_000 : 30_000));
      console.warn(`[gemini] ${model} returned ${s}; using the next model`);
    }
  }
  console.warn("[gemini] every model busy:", (last as Error)?.message?.slice(0, 160));
  throw new AiBusy("Pratihar's AI is busy right now. Please try again in a minute.");
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
