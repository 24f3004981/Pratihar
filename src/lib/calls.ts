import { z } from "zod";
import { askJson } from "./gemini";
import { getDb } from "./db";
import { recordEvents, type CallEvent } from "./tiger";
import { mekoRemember } from "./meko";
import type { CallOutcome, Lead, ToolTrace, Turn } from "./types";

export type CallDoc = {
  _id: string;
  businessId: string;
  version: number | null;
  channel: CallEvent["channel"];
  turns: Turn[];
  tools: ToolTrace[];
  state: unknown; // serialized CallState for the live loop
  startedAt: Date;
  endedAt?: Date;
  durationS?: number;
  urgent: boolean;
  handoff: string | null;
  injectionFlags: number;
  callerPhone?: string;
  callerName?: string;
  bookings: string[];
  outcome?: CallOutcome;
  summary?: { topic: string; intent: string; sentiment: number; oneLine: string };
  lead?: Lead;
  recordingUrl?: string;
};

const Summary = z.object({
  topic: z.string().max(60),
  intent: z.enum(["booking", "price", "hours", "emergency", "reschedule", "verify", "general", "complaint"]),
  sentiment: z.number().min(-1).max(1),
  oneLine: z.string().max(200),
  service: z.string().max(80),
  whyNotBooked: z.string().max(200),
  wantsCallback: z.boolean(),
  urgency: z.enum(["high", "normal", "low"]),
  followUp: z.string().max(500),
});

/** Outcome comes from what tools actually did, not from what the model says happened. */
export function outcomeOf(c: Pick<CallDoc, "bookings" | "tools" | "handoff" | "turns">): CallOutcome {
  if (c.bookings.length) return "booked";
  if (c.handoff) return "handoff";
  if (c.tools.some((t) => t.name === "log_callback" && t.allowed)) return "callback";
  if (c.turns.filter((t) => t.role === "caller").length <= 1) return "dropped";
  if (c.tools.some((t) => t.allowed && (t.result as { ok?: boolean })?.ok === false)) return "failed";
  return "answered";
}

/**
 * Runs once when a call ends (web hang-up or the ElevenLabs post-call webhook).
 * One Gemini call reads the transcript for intent, sentiment and the lead follow-up;
 * everything else is computed from tool results. Then events go to TigerData.
 */
export async function finishCall(callId: string) {
  const db = await getDb();
  const calls = db.collection<CallDoc>("calls");
  const c = await calls.findOne({ _id: callId });
  if (!c || c.endedAt) return c;
  const endedAt = new Date();
  const durationS = c.durationS ?? Math.round((endedAt.getTime() - c.startedAt.getTime()) / 1000);
  const outcome = outcomeOf(c);
  const callerLines = c.turns.filter((t) => t.role === "caller").length;

  let s: z.infer<typeof Summary> | null = null;
  if (callerLines > 0) {
    try {
      s = await askJson({
        system:
          "You read a receptionist call transcript for the business owner. Return JSON with: topic (2-4 words, what they mainly asked about), intent, sentiment (-1 angry .. 1 happy), oneLine (what happened, plain English), service (what they wanted or \"\"), whyNotBooked (\"\" if booked), wantsCallback, urgency, followUp (a short, polite WhatsApp-style message the owner can send this caller, in the caller's language; \"\" if nothing to follow up).",
        prompt: `Outcome from the system: ${outcome}. Bookings: ${c.bookings.join(", ") || "none"}.\n\n${c.turns
          .map((t) => `${t.role === "caller" ? "Caller" : "Receptionist"}: ${t.text}`)
          .join("\n")}`,
        schema: Summary,
        temperature: 0.2,
      });
    } catch (e) {
      console.warn("[calls] summary failed:", (e as Error).message);
    }
  }

  const lead: Lead | undefined =
    c.callerPhone || s?.wantsCallback
      ? {
          name: c.callerName ?? "Unknown caller",
          phone: c.callerPhone ?? "",
          service: s?.service ?? "",
          status:
            outcome === "booked"
              ? "Appointment confirmed"
              : outcome === "callback"
                ? `${s?.topic ?? "Enquiry"}, wants a call`
                : outcome === "handoff"
                  ? "Sent to staff"
                  : "Booking not completed",
          reason: s?.whyNotBooked ?? "",
          nextAction: outcome === "booked" ? "none" : s?.wantsCallback || outcome === "callback" ? "callback" : "follow-up",
          urgency: c.urgent ? "high" : (s?.urgency ?? "normal"),
          draft: outcome === "booked" ? "" : (s?.followUp ?? ""),
        }
      : undefined;

  await calls.updateOne(
    { _id: callId },
    {
      $set: {
        endedAt,
        durationS,
        outcome,
        ...(s ? { summary: { topic: s.topic, intent: s.intent, sentiment: s.sentiment, oneLine: s.oneLine } } : {}),
        ...(lead ? { lead } : {}),
      },
    },
  );

  const base = {
    time: endedAt,
    businessId: c.businessId,
    callId,
    version: c.version,
    channel: c.channel,
    intent: s?.intent ?? "general",
    outcome,
    sentiment: s?.sentiment ?? 0,
    durationS,
  };
  const events: CallEvent[] = [{ ...base, kind: "call_completed" }];
  for (const _ of c.bookings) events.push({ ...base, kind: "booking" });
  if (outcome === "callback") events.push({ ...base, kind: "callback" });
  if (c.handoff) events.push({ ...base, kind: "handoff" });
  if (c.urgent) events.push({ ...base, kind: "urgent" });
  if (c.injectionFlags) events.push({ ...base, kind: "injection" });
  for (const t of c.tools) {
    if (!t.allowed) events.push({ ...base, kind: "tool_denied", intent: t.name });
    else if ((t.result as { ok?: boolean; error?: string })?.error) events.push({ ...base, kind: "tool_failed", intent: t.name });
  }
  await recordEvents(events);

  if (c.callerPhone && s) {
    await mekoRemember(c.businessId, c.callerPhone, `${endedAt.toISOString().slice(0, 10)}: ${s.oneLine}`);
  }
  return calls.findOne({ _id: callId });
}

/** Pratihar's daily brief: plain numbers from the database, no model call needed. */
export function dailyBrief(t: { calls: number; booked: number; callbacks: number }, topic: string | null, lang: "en" | "hi") {
  if (!t.calls) return lang === "hi" ? "आज अभी तक कोई कॉल नहीं आई।" : "No calls yet today.";
  if (lang === "hi")
    return `आज ${t.calls} कॉल आईं। ${t.booked} अपॉइंटमेंट पक्के हुए। ${t.callbacks} लोगों को कॉल बैक चाहिए।${topic ? ` ज़्यादातर लोगों ने "${topic}" के बारे में पूछा।` : ""}`;
  return `Today you received ${t.calls} call${t.calls === 1 ? "" : "s"}. ${t.booked} appointment${t.booked === 1 ? " was" : "s were"} confirmed. ${t.callbacks} customer${t.callbacks === 1 ? " needs" : "s need"} a callback.${topic ? ` Most people asked about ${topic}.` : ""}`;
}
