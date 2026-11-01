import { createHmac } from "node:crypto";
import { MongoServerError } from "mongodb";
import { getDb, newId } from "./db";
import { env } from "./env";
import { DAYS, type JobCard } from "./types";

// shortcut: India has no daylight saving, so a fixed +05:30 is exact. Needs a tz library before going abroad.
const IST_MIN = 330;

export type Appointment = {
  _id: string;
  businessId: string;
  bookingId: string;
  start: Date;
  end: Date;
  service: string;
  name: string;
  phone: string;
  status: "booked" | "cancelled";
  source: "voice" | "phone" | "owner" | "trial";
  callId?: string;
  createdAt: Date;
  history: { at: Date; what: string }[];
};

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-04" + "10:30" (India time) -> UTC Date */
export function istToDate(date: string, hhmm: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h, mi) - IST_MIN * 60_000);
}

/** UTC Date -> parts as seen on a wall clock in India */
export function istParts(dt: Date) {
  const s = new Date(dt.getTime() + IST_MIN * 60_000);
  return {
    date: `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(s.getUTCDate())}`,
    time: `${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}`,
    day: DAYS[(s.getUTCDay() + 6) % 7],
  };
}

export function todayIst(): string {
  return istParts(new Date()).date;
}

export function addDays(date: string, n: number): string {
  const d = istToDate(date, "12:00");
  return istParts(new Date(d.getTime() + n * 86_400_000)).date;
}

export function humanTime(dt: Date) {
  return dt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Every slot the card's working hours allow on that date, ignoring bookings. */
export function slotGrid(card: JobCard, date: string, durationMin?: number): Date[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const day = istParts(istToDate(date, "12:00")).day;
  const step = card.slotMinutes;
  const need = durationMin ?? step;
  const out: Date[] = [];
  for (const w of card.hours[day] ?? []) {
    const open = istToDate(date, w.open).getTime();
    const close = istToDate(date, w.close).getTime();
    for (let t = open; t + need * 60_000 <= close; t += step * 60_000) out.push(new Date(t));
  }
  return out;
}

export async function availability(businessId: string, card: JobCard, date: string, service?: string) {
  const svc = card.services.find((s) => s.name.toLowerCase() === service?.toLowerCase());
  const grid = slotGrid(card, date, svc?.durationMin);
  if (!grid.length) return { date, open: [] as Date[], booked: 0, closed: true };
  const db = await getDb();
  const taken = await db
    .collection<Appointment>("appointments")
    .find({ businessId, status: "booked", start: { $gte: grid[0], $lte: grid[grid.length - 1] } })
    .project<{ start: Date }>({ start: 1 })
    .toArray();
  const takenSet = new Set(taken.map((a) => a.start.getTime()));
  const now = Date.now() + 15 * 60_000; // no booking someone into a slot that starts in 10 minutes
  const open = grid.filter((t) => !takenSet.has(t.getTime()) && t.getTime() > now);
  return { date, open, booked: takenSet.size, closed: false };
}

function sign(id: string) {
  return createHmac("sha256", env.bookingSecret).update(id).digest("base64url").slice(0, 4).toUpperCase();
}

export function makeBookingId(): string {
  const core = newId(6).toUpperCase();
  return `PRT-${core}-${sign(core)}`;
}

/** Cheap first check: is this string even one of ours? Catches made-up IDs before touching the DB. */
export function bookingIdLooksReal(id: string): boolean {
  const m = /^PRT-([A-Z0-9]{6})-([A-Z0-9_-]{4})$/i.exec(id.trim().toUpperCase());
  return !!m && sign(m[1]) === m[2];
}

export class SlotTaken extends Error {}

export async function book(input: {
  businessId: string;
  card: JobCard;
  start: Date;
  service: string;
  name: string;
  phone: string;
  source: Appointment["source"];
  callId?: string;
}): Promise<Appointment> {
  const svc = input.card.services.find((s) => s.name.toLowerCase() === input.service.toLowerCase());
  const valid = slotGrid(input.card, istParts(input.start).date, svc?.durationMin).some(
    (t) => t.getTime() === input.start.getTime(),
  );
  if (!valid) throw new SlotTaken("That time is outside working hours or not on the slot grid.");
  if (input.start.getTime() < Date.now()) throw new SlotTaken("That time has already passed.");

  const appt: Appointment = {
    _id: newId(),
    businessId: input.businessId,
    bookingId: makeBookingId(),
    start: input.start,
    end: new Date(input.start.getTime() + (svc?.durationMin ?? input.card.slotMinutes) * 60_000),
    service: svc?.name ?? input.service,
    name: input.name,
    phone: input.phone,
    status: "booked",
    source: input.source,
    callId: input.callId,
    createdAt: new Date(),
    history: [{ at: new Date(), what: `Booked via ${input.source}` }],
  };
  const db = await getDb();
  try {
    // The unique partial index makes this atomic: two callers racing for 11:00 can't both win.
    await db.collection<Appointment>("appointments").insertOne(appt);
  } catch (e) {
    if (e instanceof MongoServerError && e.code === 11000) throw new SlotTaken("Someone just booked that slot.");
    throw e;
  }
  return appt;
}

export async function cancel(businessId: string, bookingId: string, why = "Cancelled") {
  const db = await getDb();
  const r = await db.collection<Appointment>("appointments").findOneAndUpdate(
    { businessId, bookingId, status: "booked" },
    { $set: { status: "cancelled" }, $push: { history: { at: new Date(), what: why } } },
    { returnDocument: "after" },
  );
  return r;
}

export async function reschedule(businessId: string, card: JobCard, bookingId: string, newStart: Date) {
  const db = await getDb();
  const col = db.collection<Appointment>("appointments");
  const old = await col.findOne({ businessId, bookingId, status: "booked" });
  if (!old) throw new Error("No live booking with that ID.");
  // Book the new slot first; only release the old one once the new one is ours.
  const fresh = await book({ ...old, businessId, card, start: newStart, source: old.source });
  await col.updateOne(
    { _id: old._id },
    { $set: { status: "cancelled" }, $push: { history: { at: new Date(), what: `Moved to ${fresh.bookingId}` } } },
  );
  await col.updateOne(
    { _id: fresh._id },
    { $push: { history: { at: new Date(), what: `Moved from ${old.bookingId} (${humanTime(old.start)})` } } },
  );
  return fresh;
}

export async function verifyBooking(businessId: string, bookingId: string, phone?: string) {
  if (!bookingIdLooksReal(bookingId)) return { ok: false as const, why: "not a Pratihar booking ID" };
  const db = await getDb();
  const a = await db.collection<Appointment>("appointments").findOne({ businessId, bookingId: bookingId.toUpperCase() });
  if (!a) return { ok: false as const, why: "no record of this booking" };
  if (phone && a.phone.slice(-4) !== phone.replace(/\D/g, "").slice(-4))
    return { ok: false as const, why: "phone does not match the booking" };
  return { ok: true as const, appt: a };
}

export function ics(a: Appointment, businessName: string): string {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pratihar//Front desk//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${a.bookingId}@pratihar`,
    `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(a.start)}`,
    `DTEND:${f(a.end)}`,
    `SUMMARY:${esc(`${a.service} at ${businessName}`)}`,
    `DESCRIPTION:${esc(`Booking ${a.bookingId} for ${a.name}`)}`,
    a.status === "cancelled" ? "STATUS:CANCELLED" : "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
