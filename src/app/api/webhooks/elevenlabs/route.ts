import { fail, ok, route } from "@/lib/api";
import type { CallState } from "@/lib/agent";
import { finishCall, type CallDoc } from "@/lib/calls";
import { getDb } from "@/lib/db";
import { verifyWebhook } from "@/lib/eleven";
import type { Business, Turn } from "@/lib/types";

type PostCall = {
  type: string;
  data: {
    agent_id: string;
    conversation_id: string;
    transcript?: { role: "user" | "agent"; message: string | null; time_in_call_secs?: number }[];
    metadata?: { call_duration_secs?: number; start_time_unix_secs?: number; phone_call?: { external_number?: string } };
  };
};

/**
 * ElevenLabs post-call webhook. Turns a finished phone call into the same call record the
 * web line produces, then runs the shared event processor (summary, lead, TigerData events).
 */
export const POST = route(async (req: Request) => {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get("elevenlabs-signature"))) return fail("Bad signature.", 401);
  const evt = JSON.parse(raw) as PostCall;
  if (evt.type !== "post_call_transcription") return ok({ ignored: evt.type });

  const db = await getDb();
  const biz = await db.collection<Business>("businesses").findOne({ elevenAgentId: evt.data.agent_id });
  if (!biz) return fail("Unknown agent.", 404);

  const conv = evt.data.conversation_id;
  const session = await db.collection<{ _id: string; state: CallState }>("phone_sessions").findOne({ _id: `${biz._id}:${conv}` });
  const state = session?.state;
  const start = evt.data.metadata?.start_time_unix_secs ? new Date(evt.data.metadata.start_time_unix_secs * 1000) : new Date();
  const turns: Turn[] = (evt.data.transcript ?? [])
    .filter((t) => t.message)
    .map((t) => ({ role: t.role === "user" ? "caller" : "agent", text: t.message!, at: start.getTime() + (t.time_in_call_secs ?? 0) * 1000 }));

  const id = `el-${conv}`;
  const doc: CallDoc = {
    _id: id,
    businessId: biz._id,
    version: biz.liveVersion,
    channel: "phone",
    turns,
    tools: state?.tools ?? [],
    state: null,
    startedAt: start,
    durationS: evt.data.metadata?.call_duration_secs,
    urgent: state?.urgent ?? false,
    handoff: state?.handoff ?? null,
    injectionFlags: state?.session.injectionFlags ?? 0,
    callerPhone: state?.callerPhone ?? evt.data.metadata?.phone_call?.external_number?.replace(/\D/g, "").slice(-10),
    callerName: state?.callerName,
    bookings: state?.bookings ?? [],
  };
  // Webhooks retry; upsert keeps one record per conversation.
  await db.collection<CallDoc>("calls").updateOne({ _id: id }, { $setOnInsert: doc }, { upsert: true });
  const done = await finishCall(id);
  return ok({ callId: id, outcome: done?.outcome });
});
