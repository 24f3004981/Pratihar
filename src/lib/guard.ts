import { z } from "zod";
import { getDb } from "./db";

/**
 * The guard sits between the model and every side effect. The model proposes a tool call;
 * the guard decides. Nothing the caller says can grant a permission, because permissions
 * come from session state the model can't write to.
 *
 *  1. intent check   - the tool must fit what the session has actually done so far
 *  2. authorization  - per-session and per-phone limits on bookings and callbacks
 *  3. sanitization   - zod schemas, control characters stripped, phone/date formats enforced
 *  4. injection scan - caller text that tries to rewrite the rules is flagged and fenced off
 *  5. audit log      - every decision, allowed or denied, with the reason
 */

export type Session = {
  callId: string;
  businessId: string; // whose calendar bookings go into (a sandbox for practice and trial calls)
  ownerId?: string; // the real business, for its documents and caller history
  mode: "live" | "trial";
  checkedSlots: string[]; // ISO starts returned by check_availability this session
  bookings: number;
  callbacks: number;
  injectionFlags: number;
  identifiedPhone?: string;
};

const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f<>`{}]/g, " ").replace(/\s+/g, " ").trim();
const text = (max: number) => z.string().transform(clean).pipe(z.string().min(1).max(max));
const phone = z
  .string()
  .transform((s) => s.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "a 10 digit Indian mobile number"));
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

export const ARGS = {
  check_availability: z.object({ date: isoDate, service: text(80).optional() }),
  book_appointment: z.object({
    start: z.string().datetime({ offset: true }),
    service: text(80),
    name: text(60),
    phone,
  }),
  log_callback: z.object({ name: text(60).optional(), phone, reason: text(300) }),
  search_knowledge: z.object({ query: text(200) }),
  identify_caller: z.object({ phone }),
  verify_booking: z.object({ bookingId: text(20), phone: phone.optional() }),
  handoff_to_human: z.object({ reason: text(300), urgent: z.boolean().default(false) }),
} as const;
export type ToolName = keyof typeof ARGS;

export const LIMITS = { bookingsPerCall: 2, callbacksPerCall: 2, bookingsPerPhonePerDay: 3 };

type Decision = { allowed: true; args: Record<string, unknown> } | { allowed: false; reason: string };

export async function authorize(s: Session, tool: string, raw: unknown): Promise<Decision> {
  if (!(tool in ARGS)) return { allowed: false, reason: `unknown tool "${tool}"` };
  const parsed = ARGS[tool as ToolName].safeParse(raw ?? {});
  if (!parsed.success)
    return {
      allowed: false,
      reason: `bad arguments: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join(", ")}`,
    };
  const args = parsed.data as Record<string, unknown>;

  if (tool === "book_appointment") {
    // Intent: a booking must be for a slot this session actually saw as open.
    // Stops the model from inventing a time, and stops "just book me at 3am".
    const start = new Date(String(args.start)).toISOString();
    if (!s.checkedSlots.includes(start))
      return { allowed: false, reason: "slot was never offered by check_availability in this call" };
    if (s.bookings >= LIMITS.bookingsPerCall)
      return { allowed: false, reason: `booking limit (${LIMITS.bookingsPerCall}) reached for this call` };
    if (s.mode === "live") {
      const db = await getDb();
      const since = new Date(Date.now() - 86_400_000);
      const recent = await db
        .collection("appointments")
        .countDocuments({ businessId: s.businessId, phone: args.phone, createdAt: { $gte: since }, status: "booked" });
      if (recent >= LIMITS.bookingsPerPhonePerDay)
        return { allowed: false, reason: "this number already has 3 bookings today; staff should confirm" };
    }
    args.start = start;
  }
  if (tool === "log_callback" && s.callbacks >= LIMITS.callbacksPerCall)
    return { allowed: false, reason: "callback already logged for this call" };

  return { allowed: true, args };
}

const INJECTION = [
  /ignore (all |the |your )?(previous|above|earlier|prior) (instructions|rules|prompt)/i,
  /(system|developer) (prompt|message|instructions)/i,
  /you are now|act as (an? )?(admin|developer|owner)|pretend (to be|you are)/i,
  /(jailbreak|DAN mode|do anything now)/i,
  /(reveal|show|print|tell me) (your|the) (prompt|instructions|rules)/i,
  /(free|zero|0 ?rs|₹ ?0) (appointment|booking|treatment|consultation)/i,
  /owner (ne|has) (said|bola|kaha|approved)/i,
  /(pichle|purane|saare) (instructions|rules) (bhool|ignore|chhod)/i,
  /admin (mode|access|override)/i,
];

export function scanInjection(utterance: string): string | null {
  const hit = INJECTION.find((r) => r.test(utterance));
  return hit ? hit.source : null;
}

const URGENT = [
  /emergenc/i,
  /bleed|bleeding|khoon|blood/i,
  /chest pain|seene (mein|me) dard|saans (nahi|nahin|phool)|breath/i,
  /accident|behosh|unconscious|faint/i,
  /bahut (zyada |jyada )?dard|severe pain|unbearable/i,
  /swelling.*(face|jaw)|muh suj/i,
  /turant|abhi ke abhi|right now|urgent/i,
];

export function detectUrgency(utterance: string): boolean {
  return URGENT.some((r) => r.test(utterance));
}

export async function audit(s: Session, entry: { tool: string; args: unknown; allowed: boolean; reason?: string }) {
  if (s.mode === "trial") return; // trial runs keep their own trace on the run document
  const db = await getDb();
  await db.collection("audit").insertOne({ businessId: s.businessId, callId: s.callId, at: new Date(), ...entry });
}
