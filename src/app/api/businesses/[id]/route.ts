import { requireBusiness } from "@/lib/auth";
import { z } from "zod";
import { body, ok, route, type Ctx } from "@/lib/api";
import { createVersion, listVersions } from "@/lib/business";
import { getDb } from "@/lib/db";
import { isKnownVoice } from "@/lib/eleven";
import { cardGaps } from "@/lib/interview";
import { gate, regressionTests, type Run } from "@/lib/trial";
import { JobCardSchema, type Business } from "@/lib/types";

export const GET = route(async (_: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  const { business: b } = await requireBusiness(id);
  const db = await getDb();
  const [versions, runs, tests] = await Promise.all([
    listVersions(id),
    db.collection<Run>("runs").find({ businessId: id }, { projection: { results: 0 } }).sort({ createdAt: -1 }).limit(20).toArray(),
    regressionTests(id),
  ]);
  const latestRunFor = (n: number) => runs.find((r) => r.version === n) ?? null;
  return ok({
    business: b,
    gaps: b.card ? cardGaps(b.card) : [],
    versions: versions.map((v) => ({ ...v, run: latestRunFor(v.n) })),
    tests,
  });
});

export const PATCH = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  const input = await body(
    req,
    z.object({
      voiceId: z.string().refine(isKnownVoice, "not one of Pratihar's voices").optional(),
      card: JobCardSchema.optional(),
      note: z.string().max(120).optional(),
    }),
  );
  const { business: b } = await requireBusiness(id);
  const db = await getDb();
  if (input.voiceId) await db.collection<Business>("businesses").updateOne({ _id: id }, { $set: { voiceId: input.voiceId } });
  if (input.card) await createVersion(id, input.card, input.note ?? "Edited by owner", b.latestVersion || null);
  return ok((await requireBusiness(id)).business);
});
