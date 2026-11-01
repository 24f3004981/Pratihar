import { createHmac, timingSafeEqual } from "node:crypto";
import { env, need } from "./env";

const API = "https://api.elevenlabs.io/v1";

// Hand-picked from the ElevenLabs library: young Indian women who handle Hindi, English and Hinglish.
export const VOICES = [
  { id: "EHeVIpHOvJGuhp2QcMZZ", name: "Pyaari", note: "Easy, friendly Hinglish. Our default." },
  { id: "KiyhWeX8ertYnl678VkL", name: "Chandni", note: "Cute and patient, repeats back before booking." },
  { id: "IzQxb6JkxyJg77HNbm6b", name: "Anjura", note: "Bright and warm, good for busy front desks." },
  { id: "cVCsnHwp2N6T6knBBlSd", name: "Tripti", note: "Calm and professional, clinics and banks." },
  { id: "5pmEsALT3A7WzePUT1r6", name: "Kanika", note: "Natural pauses, sounds like a real person." },
  { id: "LZOmv8tnIt32q9IdMoi9", name: "Rhea", note: "Energetic, clear on the phone." },
  { id: "oR3MB6ZZsjdV90ztz1xE", name: "Paaro", note: "Unhurried and textured." },
] as const;

export function isKnownVoice(id: string) {
  return VOICES.some((v) => v.id === id);
}

export async function tts(text: string, voiceId: string): Promise<Response> {
  const res = await fetch(`${API}/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": need(env.elevenKey, "ELEVENLABS_API_KEY"), "content-type": "application/json" },
    body: JSON.stringify({
      text: text.slice(0, 1200),
      // flash v2.5 keeps phone-like latency and handles Hinglish code-switching
      model_id: "eleven_flash_v2_5",
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

export async function stt(audio: Blob, lang?: string): Promise<{ text: string; language: string }> {
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("file", audio, "speech.webm");
  form.append("tag_audio_events", "false");
  // a hint stops Hindi speech being forced into English words; Hinglish speakers are mostly Hindi phonetically
  if (lang === "en") form.append("language_code", "eng");
  else if (lang === "hi" || lang === "hinglish") form.append("language_code", "hin");
  const res = await fetch(`${API}/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": need(env.elevenKey, "ELEVENLABS_API_KEY") },
    body: form,
  });
  if (!res.ok) throw new Error(`ElevenLabs STT ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { text?: string; language_code?: string };
  return { text: (json.text ?? "").trim(), language: json.language_code ?? "" };
}

/** ElevenLabs signs post-call webhooks as `t=<unix>,v0=<hex hmac of "t.body">`. */
export function verifyWebhook(rawBody: string, header: string | null, maxAgeSec = 1800): boolean {
  if (!env.elevenWebhookSecret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > maxAgeSec || !parts.v0) return false;
  const want = createHmac("sha256", env.elevenWebhookSecret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(want);
  const b = Buffer.from(parts.v0);
  return a.length === b.length && timingSafeEqual(a, b);
}

const TOOL_PARAMS: Record<string, { description: string; props: Record<string, string>; required: string[] }> = {
  check_availability: {
    description: "List open appointment slots on a date (YYYY-MM-DD, India time).",
    props: { date: "Date in YYYY-MM-DD", service: "Service name, optional" },
    required: ["date"],
  },
  book_appointment: {
    description: "Book a slot that check_availability returned. Only after the caller confirms.",
    props: { start: "Slot start ISO time", service: "Service", name: "Caller name", phone: "10 digit mobile" },
    required: ["start", "service", "name", "phone"],
  },
  log_callback: {
    description: "Log a callback request for staff.",
    props: { name: "Caller name", phone: "Mobile", reason: "Why they need a callback" },
    required: ["phone", "reason"],
  },
  search_knowledge: {
    description: "Search the owner's uploaded documents for prices, policies and FAQs.",
    props: { query: "What to look up" },
    required: ["query"],
  },
};

/**
 * Publish the tested version as an ElevenLabs Conversational AI agent so it can take
 * real phone calls (SIP / Twilio) and power the website widget. Tools call back into
 * /api/tools/<business>/<tool>, which runs the same guard as the web receptionist.
 */
export async function publishAgent(opts: {
  businessId: string;
  name: string;
  prompt: string;
  firstMessage: string;
  voiceId: string;
  existingId?: string;
}): Promise<string> {
  const key = need(env.elevenKey, "ELEVENLABS_API_KEY");
  const tools = Object.entries(TOOL_PARAMS).map(([name, t]) => ({
    type: "webhook",
    name,
    description: t.description,
    api_schema: {
      url: `${env.publicUrl}/api/tools/${opts.businessId}/${name}`,
      method: "POST",
      // our tool endpoints refuse any request without this header
      request_headers: env.toolsSecret ? { "x-pratihar-key": env.toolsSecret } : {},
      request_body_schema: {
        type: "object",
        properties: {
          ...Object.fromEntries(Object.entries(t.props).map(([k, d]) => [k, { type: "string", description: d }])),
          // lets our guard keep one session per phone call (slots offered, bookings made)
          conversation_id: { type: "string", dynamic_variable: "system__conversation_id" },
        },
        required: t.required,
      },
    },
  }));
  const body = {
    name: `Pratihar · ${opts.name}`,
    conversation_config: {
      agent: {
        first_message: opts.firstMessage,
        language: "hi",
        prompt: { prompt: opts.prompt, llm: "gemini-2.5-flash", tools },
      },
      tts: { voice_id: opts.voiceId, model_id: "eleven_flash_v2_5" },
    },
  };
  const url = opts.existingId ? `${API}/convai/agents/${opts.existingId}` : `${API}/convai/agents/create`;
  const res = await fetch(url, {
    method: opts.existingId ? "PATCH" : "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ElevenLabs agent ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { agent_id?: string };
  return json.agent_id ?? opts.existingId ?? "";
}
