import { requireBusiness } from "@/lib/auth";
import { fail, route, type Ctx } from "@/lib/api";
import { ics, type Appointment } from "@/lib/calendar";
import { getDb } from "@/lib/db";

export const GET = route(async (_: Request, { params }: Ctx<{ id: string; bookingId: string }>) => {
  const { id, bookingId } = await params;
  const { business: b } = await requireBusiness(id);
  const db = await getDb();
  const a = await db.collection<Appointment>("appointments").findOne({ businessId: id, bookingId });
  if (!a) return fail("No booking with that ID.", 404);
  return new Response(ics(a, b.name), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${a.bookingId}.ics"`,
    },
  });
});
