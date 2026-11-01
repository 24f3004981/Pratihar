import { requireBusiness } from "@/lib/auth";
import { after } from "next/server";
import { z } from "zod";
import { body, ok, route, type Ctx } from "@/lib/api";
import { getDb } from "@/lib/db";
import { coach, createRun, executeRun, type Run } from "@/lib/trial";

export const maxDuration = 300;

export const POST = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  await requireBusiness(id);
  const input = await body(
    req,
    z.object({
      fromVersion: z.number().int().positive(),
      sentence: z.string().trim().min(5).max(400),
      runId: z.string().optional(),
      scenarioId: z.string().optional(),
      rep: z.number().int().optional(),
    }),
  );
  let failed;
  if (input.runId) {
    const db = await getDb();
    const run = await db.collection<Run>("runs").findOne({ _id: input.runId, businessId: id });
    failed = run?.results.find((r) => r.scenarioId === input.scenarioId && (!input.rep || r.rep === input.rep));
  }
  const out = await coach(id, input.fromVersion, input.sentence, failed);
  const run = await createRun(id, out.version.n);
  after(() => executeRun(run._id));
  return ok({ version: out.version.n, rule: out.rule, test: out.test, runId: run._id });
});
