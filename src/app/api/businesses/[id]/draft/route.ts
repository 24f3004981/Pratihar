import { requireBusiness } from "@/lib/auth";
import { ok, route, type Ctx } from "@/lib/api";
import { getDb } from "@/lib/db";
import { cardGaps, extractCard } from "@/lib/interview";
import type { Business } from "@/lib/types";

export const maxDuration = 60;

/** Re-reads the interview so far into a draft card. Called in the background after each answer. */
export const POST = route(async (_: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  const { business: b } = await requireBusiness(id);
  if (!b.interview.some((t) => t.role === "owner")) return ok({ draft: b.draft ?? null, gaps: [] });
  const draft = await extractCard(b.interview, b.draft ?? b.card);
  const db = await getDb();
  await db.collection<Business>("businesses").updateOne({ _id: id }, { $set: { draft } });
  return ok({ draft, gaps: cardGaps(draft) });
});
