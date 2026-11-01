import { fail, ok, route, type Ctx } from "@/lib/api";
import { requireBusiness } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { gate, type Run } from "@/lib/trial";

export const GET = route(async (_: Request, { params }: Ctx<{ rid: string }>) => {
  const { rid } = await params;
  const db = await getDb();
  const run = await db.collection<Run>("runs").findOne({ _id: rid });
  if (!run) return fail("No such run.", 404);
  await requireBusiness(run.businessId);
  return ok({ ...run, gate: gate(run) });
});
