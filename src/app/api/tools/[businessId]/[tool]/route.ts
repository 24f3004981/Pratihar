import { fail, ok, route, type Ctx } from "@/lib/api";
import { cardFor, getBusiness } from "@/lib/business";
import { invoke, newCall, type CallState } from "@/lib/agent";
import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Tool webhooks for the ElevenLabs phone agent. Same guard, same calendar, same audit log
 * as the web receptionist. Session state is kept per ElevenLabs conversation, so the
 * "only book a slot you were offered" rule holds on the phone too.
 */
export const POST = route(async (req: Request, { params }: Ctx<{ businessId: string; tool: string }>) => {
  const { businessId, tool } = await params;
  // Without this, anyone on the internet could book slots through the phone tools.
  const given = Buffer.from(req.headers.get("x-pratihar-key") ?? "");
  const want = Buffer.from(env.toolsSecret);
  if (!env.toolsSecret || given.length !== want.length || !timingSafeEqual(given, want)) return fail("Not allowed.", 401);
  const b = await getBusiness(businessId);
  const c = await cardFor(b, "live");
  if (!c) return fail("Not live.", 409);
  const args = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const conv = String(args.conversation_id ?? "").slice(0, 80) || "anonymous";
  delete args.conversation_id;

  const db = await getDb();
  const sessions = db.collection<{ _id: string; state: CallState; at: Date }>("phone_sessions");
  const key = `${businessId}:${conv}`;
  const saved = await sessions.findOne({ _id: key });
  const state = saved?.state ?? newCall(businessId, "live", `el-${conv}`);
  const result = await invoke(state, c.card, tool, args);
  await sessions.updateOne({ _id: key }, { $set: { state, at: new Date() } }, { upsert: true });
  return ok(result);
});
