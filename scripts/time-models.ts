// Times a short receptionist-style prompt on each candidate model:
// `npx tsx --env-file=.env.local scripts/time-models.ts`
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const MODELS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.8-flash-lite", "gemini-3.5-flash-lite"];

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  for (const model of MODELS) {
    const t = Date.now();
    try {
      const r = await ai.models.generateContent({
        model,
        contents: "Caller: Root canal kitne ka hai? Reply as a clinic receptionist in one Hinglish sentence. The price is not on the list, so offer a callback.",
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
      });
      console.log(`${model.padEnd(24)} ${String(Date.now() - t).padStart(6)} ms  ${(r.text ?? "").trim().slice(0, 90)}`);
    } catch (e) {
      console.log(`${model.padEnd(24)} ${String(Date.now() - t).padStart(6)} ms  ERROR ${(e as Error).message.slice(0, 90)}`);
    }
  }
}
main();
