import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { body, ok, route, type Ctx } from "@/lib/api";
import { createVersion } from "@/lib/business";
import { getDb } from "@/lib/db";
import { cardGaps, extractCard, interviewTurn } from "@/lib/interview";
import type { Business, Turn } from "@/lib/types";

export const maxDuration = 60;

/**
 * One interview turn: returns the next question as fast as possible. The live card is updated
 * by a separate request (./draft) so the voice conversation never waits on it. When the
 * interview is complete, the card is written and saved as the first real version.
 */
export const POST = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  const { text, reset, lang } = await body(
    req,
    z.object({ text: z.string().trim().max(2000).optional(), reset: z.boolean().optional(), lang: z.enum(["en", "hi", "hinglish"]).default("en") }),
  );
  const { business: b } = await requireBusiness(id);
  const history: Turn[] = reset ? [] : [...b.interview];
  if (text) history.push({ role: "owner", text, at: Date.now() });

  const next = await interviewTurn(history, lang);
  history.push({ role: "assistant", text: next.reply, at: Date.now() });
  const db = await getDb();
  await db.collection<Business>("businesses").updateOne({ _id: id }, { $set: { interview: history, ...(reset ? { draft: null } : {}) } });

  if (!next.done) return ok({ interview: history, done: false, draft: reset ? null : (b.draft ?? null), version: null });

  const card = await extractCard(history, b.draft ?? b.card);
  const v = await createVersion(id, card, b.card ? "Rebuilt from interview" : "First card", b.latestVersion || null);
  await db.collection<Business>("businesses").updateOne({ _id: id }, { $set: { draft: card } });
  return ok({ interview: history, done: true, draft: card, gaps: cardGaps(card), version: v.n });
});
