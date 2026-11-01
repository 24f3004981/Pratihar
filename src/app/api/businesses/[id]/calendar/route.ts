import { requireBusiness } from "@/lib/auth";
import { z } from "zod";
import { body, fail, ok, route, type Ctx } from "@/lib/api";
import { cardFor } from "@/lib/business";
import { addDays, book, cancel, istToDate, reschedule, SlotTaken, slotGrid, todayIst, type Appointment } from "@/lib/calendar";
import { getDb } from "@/lib/db";

export const GET = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || todayIst();
  const days = Math.min(14, Math.max(1, Number(url.searchParams.get("days")) || 7));
  const phone = url.searchParams.get("phone")?.replace(/\D/g, "").slice(-10);
  const { business: b } = await requireBusiness(id);
  const db = await getDb();
  const col = db.collection<Appointment>("appointments");

  if (phone) {
    const history = await col.find({ businessId: id, phone }).sort({ start: -1 }).limit(50).toArray();
    return ok({ history });
  }
  const c = (await cardFor(b, "live")) ?? (await cardFor(b, "latest"));
  const start = istToDate(from, "00:00");
  const end = istToDate(addDays(from, days), "00:00");
  const appts = await col.find({ businessId: id, start: { $gte: start, $lt: end } }).sort({ start: 1 }).toArray();
  const grid = c
    ? Array.from({ length: days }, (_, i) => {
        const date = addDays(from, i);
        return { date, slots: slotGrid(c.card, date).map((d) => d.toISOString()) };
      })
    : [];
  return ok({ from, days, grid, appointments: appts });
});

const Action = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("book"),
    start: z.string().datetime({ offset: true }),
    service: z.string().min(1).max(80),
    name: z.string().trim().min(1).max(60),
    phone: z.string().transform((s) => s.replace(/\D/g, "").slice(-10)).pipe(z.string().regex(/^[6-9]\d{9}$/)),
  }),
  z.object({ action: z.literal("cancel"), bookingId: z.string() }),
  z.object({ action: z.literal("reschedule"), bookingId: z.string(), start: z.string().datetime({ offset: true }) }),
]);

export const POST = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  const input = await body(req, Action);
  const { business: b } = await requireBusiness(id);
  const c = (await cardFor(b, "live")) ?? (await cardFor(b, "latest"));
  if (!c) return fail("Build the job card first so Pratihar knows your hours.", 409);
  try {
    if (input.action === "book") {
      const a = await book({ businessId: id, card: c.card, start: new Date(input.start), service: input.service, name: input.name, phone: input.phone, source: "owner" });
      return ok(a, { status: 201 });
    }
    if (input.action === "cancel") {
      const a = await cancel(id, input.bookingId, "Cancelled by owner");
      return a ? ok(a) : fail("No live booking with that ID.", 404);
    }
    return ok(await reschedule(id, c.card, input.bookingId, new Date(input.start)));
  } catch (e) {
    // The DB said no: either someone holds that slot or it's off the grid. Tell the owner which.
    if (e instanceof SlotTaken) return fail(`Double-booking blocked: ${e.message}`, 409);
    throw e;
  }
});
