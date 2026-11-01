import { after } from "next/server";
import { z } from "zod";
import { body, fail, ok, route, type Ctx } from "@/lib/api";
import { finishCall, type CallDoc } from "@/lib/calls";
import { getDb } from "@/lib/db";

export const maxDuration = 60;

export const POST = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  const { callId } = await body(req, z.object({ callId: z.string().max(40) }));
  const db = await getDb();
  const call = await db.collection<CallDoc & { practice?: boolean }>("calls").findOne({ _id: callId, businessId: id });
  if (!call) return fail("No such call.", 404);
  if (call.practice) {
    await db.collection("calls").deleteOne({ _id: callId as never });
    await db.collection("appointments").deleteMany({ businessId: `practice-${id}` });
    return ok({ practice: true });
  }
  if (call.endedAt) return ok({ ended: true });
  // Summary, lead and TigerData events take a few seconds; the caller shouldn't wait for them.
  after(() => finishCall(callId).catch((e) => console.error("[calls] finish failed", e)));
  return ok({ ended: true });
});
