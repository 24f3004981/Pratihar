import { z } from "zod";
import { body, fail, route } from "@/lib/api";
import { tooManyAttempts } from "@/lib/auth";
import { isKnownVoice, tts } from "@/lib/eleven";
import { env } from "@/lib/env";

// Voice previews repeat the same sentence, so keep the audio in memory instead of paying twice.
const cache = new Map<string, ArrayBuffer>();

export const POST = route(async (req: Request) => {
  // Public endpoint that spends ElevenLabs credits, so cap it per visitor.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (tooManyAttempts(`tts:${ip}`, 120, 10 * 60_000)) return fail("Too many requests. Try again in a few minutes.", 429);
  const { text, voiceId } = await body(
    req,
    z.object({ text: z.string().trim().min(1).max(1200), voiceId: z.string().optional() }),
  );
  const voice = voiceId && isKnownVoice(voiceId) ? voiceId : env.defaultVoice;
  const key = `${voice}:${text}`;
  let audio = cache.get(key);
  if (!audio) {
    audio = await (await tts(text, voice)).arrayBuffer();
    if (text.length < 200) {
      if (cache.size > 200) cache.delete(cache.keys().next().value!);
      cache.set(key, audio);
    }
  }
  return new Response(audio, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
});
