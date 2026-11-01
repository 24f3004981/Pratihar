import { z } from "zod";
import { body, fail, ok, route, type Ctx } from "@/lib/api";
import { requireBusiness } from "@/lib/auth";
import { cardFor, getBusiness, getVersion } from "@/lib/business";
import { firstMessage, newCall, respond, type CallState } from "@/lib/agent";
import { getDb } from "@/lib/db";
import { mekoLogTurn } from "@/lib/meko";
import type { CallDoc } from "@/lib/calls";

export const maxDuration = 60;

/**
 * The web phone line. First POST (no callId) opens a call and returns the greeting.
 * Every later POST is one caller turn. `practice` talks to the newest draft on a
 * sandbox calendar, so the owner can try it before going live.
 */
export const POST = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  const input = await body(
    req,
    z.object({
      callId: z.string().max(40).optional(),
      text: z.string().trim().max(1000).optional(),
      practice: z.boolean().default(false),
      channel: z.enum(["web", "widget"]).default("web"),
    }),
  );
  const b = await getBusiness(id);
  // Practice calls use the unreleased draft, so only its owner may make them.
  if (input.practice) await requireBusiness(id);
  const db = await getDb();
  const calls = db.collection<CallDoc & { practice?: boolean }>("calls");

  if (!input.callId) {
    // Before going live, the share link still works as a test line on the newest card,
    // so the owner can hand it to friends; those calls are tagged "test".
    const c = input.practice ? await cardFor(b, "latest") : ((await cardFor(b, "live")) ?? (await cardFor(b, "latest")));
    const testLine = !input.practice && !b.liveVersion;
    if (!c) return fail(input.practice ? "There's no card yet." : `${b.name} is still setting up their receptionist. Please call back soon.`, 409);
    const calendarId = input.practice ? `practice-${id}` : id;
    const state = newCall(calendarId, "live", undefined, id);
    const greeting = firstMessage(c.card);
    state.contents.push({ role: "model", parts: [{ text: greeting }] });
    await calls.insertOne({
      _id: state.session.callId,
      businessId: id,
      version: c.n,
      channel: testLine ? "test" : input.channel,
      practice: input.practice,
      turns: [{ role: "agent", text: greeting, at: Date.now() }],
      tools: [],
      state,
      startedAt: new Date(),
      urgent: false,
      handoff: null,
      injectionFlags: 0,
      bookings: [],
    });
    return ok({ callId: state.session.callId, reply: greeting, voiceId: b.voiceId, version: c.n, test: testLine });
  }

  if (!input.text) return fail("Say something first.");
  const call = await calls.findOne({ _id: input.callId, businessId: id });
  if (!call) return fail("That call has ended or never started.", 404);
  if (call.endedAt) return fail("That call has ended.", 410);
  if (call.turns.length > 80) return fail("This call is very long. Please start a new one.", 429);

  // a call keeps the card it started with, even if the owner edits or goes live mid-call
  const c = call.version ? await getVersion(id, call.version) : null;
  if (!c) return fail("This line isn't set up any more.", 409);
  const state = call.state as CallState;
  const reply = await respond(state, c.card, input.text);
  const now = Date.now();
  await calls.updateOne(
    { _id: call._id },
    {
      $set: {
        state,
        tools: state.tools,
        urgent: state.urgent,
        handoff: state.handoff,
        injectionFlags: state.session.injectionFlags,
        bookings: state.bookings,
        callerPhone: state.callerPhone,
        callerName: state.callerName,
      },
      $push: { turns: { $each: [{ role: "caller", text: input.text, at: now }, { role: "agent", text: reply, at: now }] } },
    },
  );
  if (!call.practice) void mekoLogTurn(call._id, id, input.text, reply);
  return ok({
    reply,
    urgent: state.urgent,
    handoff: state.handoff ? { reason: state.handoff, phone: c.card.handoffPhone || null } : null,
    bookings: state.bookings,
    tools: state.tools.slice(-4).map((t) => ({ name: t.name, allowed: t.allowed, reason: t.reason })),
  });
});
