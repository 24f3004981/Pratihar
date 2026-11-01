import { requireBusiness } from "@/lib/auth";
import { ok, route, type Ctx } from "@/lib/api";
import { getDb } from "@/lib/db";
import type { CallDoc } from "@/lib/calls";

export const GET = route(async (_: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  await requireBusiness(id);
  const db = await getDb();
  const [calls, callbacks] = await Promise.all([
    db
      .collection<CallDoc>("calls")
      .find({ businessId: id, endedAt: { $exists: true } }, { projection: { state: 0 } })
      .sort({ startedAt: -1 })
      .limit(100)
      .toArray(),
    db.collection("callbacks").find({ businessId: id }).sort({ at: -1 }).limit(100).toArray(),
  ]);
  return ok({ calls, callbacks });
});
