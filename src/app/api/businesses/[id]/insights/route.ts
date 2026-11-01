import { requireBusiness } from "@/lib/auth";
import { ok, route, type Ctx } from "@/lib/api";
import { dailyBrief } from "@/lib/calls";
import { getDb } from "@/lib/db";
import { analytics, topQuestion } from "@/lib/tiger";

export const GET = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  await requireBusiness(id);
  const url = new URL(req.url);
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 14));
  const lang = url.searchParams.get("lang") === "hi" ? "hi" : "en";
  const db = await getDb();
  const [a, topic, openCallbacks] = await Promise.all([
    analytics(id, days),
    topQuestion(id, 1),
    db.collection("callbacks").countDocuments({ businessId: id, status: "open" }),
  ]);
  return ok({ ...a, openCallbacks, topic, brief: dailyBrief(a.today, topic, lang) });
});
