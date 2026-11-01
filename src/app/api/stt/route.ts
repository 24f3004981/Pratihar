import { fail, ok, route } from "@/lib/api";
import { stt } from "@/lib/eleven";
import { tooManyAttempts } from "@/lib/auth";

export const POST = route(async (req: Request) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (tooManyAttempts(`stt:${ip}`, 120, 10 * 60_000)) return fail("Too many requests. Try again in a few minutes.", 429);
  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size < 1500) return fail("Didn't catch that. Hold the button a little longer.", 422);
  if (audio.size > 10 * 1024 * 1024) return fail("That recording is too long.", 413);
  const lang = form.get("lang");
  const out = await stt(audio, typeof lang === "string" ? lang : undefined);
  if (!out.text) return fail("Couldn't hear any words. Try again closer to the mic.", 422);
  return ok(out);
});
