import { requireBusiness } from "@/lib/auth";
import { ok, route, type Ctx } from "@/lib/api";
import { getDb } from "@/lib/db";

export const GET = route(async (_: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  await requireBusiness(id);
  const db = await getDb();
  const rows = await db.collection("audit").find({ businessId: id }).sort({ at: -1 }).limit(200).toArray();
  return ok(rows);
});
