import { requireBusiness } from "@/lib/auth";
import { z } from "zod";
import { body, fail, ok, route, type Ctx } from "@/lib/api";
import { getVersion } from "@/lib/business";
import { getDb } from "@/lib/db";
import { firstMessage, systemPrompt } from "@/lib/agent";
import { publishAgent } from "@/lib/eleven";
import { env } from "@/lib/env";
import { gate, type Run } from "@/lib/trial";
import type { Business } from "@/lib/types";

export const POST = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  const { version, action } = await body(
    req,
    z.object({ version: z.number().int().positive(), action: z.enum(["live", "rollback"]).default("live") }),
  );
  const { business: b } = await requireBusiness(id);
  const v = await getVersion(id, version);
  const db = await getDb();

  if (action === "live") {
    // Only a version that passed its own Trial Day can take real calls.
    const run = await db.collection<Run>("runs").findOne({ businessId: id, version, status: "done" }, { sort: { createdAt: -1 } });
    const g = gate(run);
    if (!g.ok) return fail(`Version ${version} can't go live yet. ${g.why}`, 409);
  } else if (!b.liveVersion || version >= b.liveVersion) {
    return fail("Rollback goes to an older version than the one that's live.", 409);
  }

  await db
    .collection<Business>("businesses")
    .updateOne({ _id: id }, { $set: { liveVersion: version }, $push: { history: { at: new Date(), action, version } } as never });

  // Phone line: mirror the live version to an ElevenLabs agent. The web line works without it.
  let phone: { agentId?: string; error?: string } = {};
  if (env.elevenKey && !env.publicUrl.includes("localhost")) {
    try {
      const agentId = await publishAgent({
        businessId: id,
        name: b.name,
        prompt: systemPrompt(v.card),
        firstMessage: firstMessage(v.card),
        voiceId: b.voiceId,
        existingId: b.elevenAgentId,
      });
      await db.collection<Business>("businesses").updateOne({ _id: id }, { $set: { elevenAgentId: agentId } });
      phone = { agentId };
    } catch (e) {
      phone = { error: (e as Error).message };
    }
  } else {
    phone = { error: "Phone agent needs ELEVENLABS_API_KEY and a public PUBLIC_URL (not localhost)." };
  }
  return ok({ liveVersion: version, phone });
});
