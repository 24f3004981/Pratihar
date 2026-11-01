import { requireBusiness } from "@/lib/auth";
import { after } from "next/server";
import { z } from "zod";
import { body, fail, ok, route, type Ctx } from "@/lib/api";
import { getVersion } from "@/lib/business";
import { getDb } from "@/lib/db";
import { need, env } from "@/lib/env";
import { createRun, executeRun, type Run } from "@/lib/trial";

export const maxDuration = 300;

export const POST = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  need(env.geminiKey, "GEMINI_API_KEY");
  const { version } = await body(req, z.object({ version: z.number().int().positive().optional() }));
  const { business: b } = await requireBusiness(id);
  const n = version ?? b.latestVersion;
  if (!n) return fail("Build the job card first.", 409);
  await getVersion(id, n);
  const db = await getDb();
  const running = await db.collection<Run>("runs").findOne({ businessId: id, status: "running", createdAt: { $gt: new Date(Date.now() - 10 * 60_000) } });
  if (running) return ok(running);
  const run = await createRun(id, n);
  after(() => executeRun(run._id));
  return ok(run, { status: 202 });
});
