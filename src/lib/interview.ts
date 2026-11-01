import { z } from "zod";
import { askJson } from "./gemini";
import { DAYS, JobCardSchema, type JobCard, type Turn } from "./types";

const TOPICS = [
  "business name, what kind of business, city",
  "services with prices (exact numbers; it's fine to say a price isn't fixed)",
  "working hours for each day, and how long one appointment slot is",
  "rules the receptionist must always follow",
  "what to do in an emergency, and a staff number for handoff",
];

const Next = z.object({ reply: z.string().min(1).max(600), done: z.boolean() });

export type Lang = "en" | "hi" | "hinglish";
const SPEAK: Record<Lang, string> = {
  en: "Reply ONLY in simple English, even if the owner mixes in Hindi words.",
  hi: "Reply ONLY in Hindi written in Devanagari script (simple everyday Hindi; common English words like 'appointment' are fine in Devanagari).",
  hinglish: "Reply ONLY in Hinglish: Hindi and English mixed, written in Roman script, the way people text in India.",
};

export async function interviewTurn(history: Turn[], lang: Lang = "en") {
  return askJson({
    system: `You are Pratihar (a woman; in Hindi use feminine forms like \"karungi\", \"rahi hoon\"), the friendly assistant who sets up an AI receptionist for an Indian small business owner. Interview them one short question at a time. Topics to cover, in order: ${TOPICS.join("; ")}.
Language: ${SPEAK[lang]}
Rules: ask one thing per turn and keep it to one or two short sentences, because it is read aloud; if an answer is vague about a price or time, ask once more; never invent details; acknowledge what they said in a few words before asking the next thing. The owner's words come from speech-to-text, which often mishears Indian names and places (e.g. "rally" for "Delhi", "Indra Puram" for "Indirapuram") and may mix Devanagari and Roman script. Read answers phonetically and in context: if a word sounds like a plausible city, name, price or time, accept the sensible reading and confirm it in your acknowledgement instead of asking again. Only if the answer is truly unrelated, reply kindly in one short line and repeat the current question. When every topic is covered, set done=true and tell them you'll now write their card.
Return JSON {"reply": string, "done": boolean}.`,
    prompt: history.length
      ? `Conversation so far:\n${history.map((t) => `${t.role === "owner" ? "Owner" : "Pratihar"}: ${t.text}`).join("\n")}\n\nYour next turn:`
      : `Start the interview. Greet them warmly in one line and ask the first question. ${SPEAK[lang]}`,
    schema: Next,
    temperature: 0.5,
  });
}

export async function extractCard(history: Turn[], previous?: JobCard | null): Promise<JobCard> {
  const card = await askJson({
    system: `Turn a shop owner's interview into a job card for their AI receptionist. Output JSON matching:
{"businessName": string, "kind": string, "city": string, "ownerName": string, "handoffPhone": string,
 "languages": ("en"|"hi"|"hinglish")[],
 "hours": {"mon"|"tue"|"wed"|"thu"|"fri"|"sat"|"sun": [{"open":"HH:MM","close":"HH:MM"}]},
 "slotMinutes": number,
 "services": [{"name": string, "price": number|null, "durationMin": number, "notes": string}],
 "rules": string[], "faqs": [{"q": string, "a": string}], "emergency": string, "greeting": string}
Hard rules: copy prices exactly; if no price was given use null (never estimate). Use 24h times. A day not mentioned as open gets []. Only include rules the owner actually said. Write a one-sentence greeting in Hinglish that says the receptionist is an AI; she is a woman, so use feminine verb forms (\"sakti hoon\", \"bol rahi hoon\").`,
    prompt: `${previous ? `Current card (update it, keep what still holds):\n${JSON.stringify(previous)}\n\n` : ""}Interview:\n${history
      .map((t) => `${t.role === "owner" ? "Owner" : "Pratihar"}: ${t.text}`)
      .join("\n")}`,
    schema: JobCardSchema,
  });
  // Belt and braces: a closing time before the opening time is always a mistake.
  for (const d of DAYS) card.hours[d] = (card.hours[d] ?? []).filter((w) => w.open < w.close);
  return card;
}

/** What the owner still hasn't told us, so the Card screen can nudge them. */
export function cardGaps(card: JobCard): string[] {
  const gaps: string[] = [];
  if (!DAYS.some((d) => card.hours[d]?.length)) gaps.push("No working hours, so nothing can be booked.");
  if (!card.services.length) gaps.push("No services listed.");
  const unpriced = card.services.filter((s) => s.price === null).map((s) => s.name);
  if (unpriced.length) gaps.push(`No price for ${unpriced.join(", ")}. Pratihar will offer a callback instead of guessing.`);
  if (!card.handoffPhone) gaps.push("No staff number for emergencies and handoff.");
  if (!card.emergency) gaps.push("No emergency instructions.");
  return gaps;
}
