<div align="center">

<img src="public/video/pratihar-en.jpg" alt="Pratihar" width="100%" />

# Pratihar · प्रतिहार

**An AI receptionist for Indian small businesses.**<br/>
It answers every call in Hindi, English or Hinglish, books the visit, and tells the owner who needs a call back.

[**Live app**](https://pratihar.vercel.app) · [**Watch the demo (English)**](https://pratihar.vercel.app/video/pratihar-en.mp4) · [**डेमो देखिए (हिंदी)**](https://pratihar.vercel.app/video/pratihar-hi.mp4)

![Next.js](https://img.shields.io/badge/Next.js_15-1b2430?logo=nextdotjs&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-0d7377?logo=googlegemini&logoColor=white)
![ElevenLabs](https://img.shields.io/badge/ElevenLabs-1b2430?logo=elevenlabs&logoColor=white)
![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-0d7377?logo=mongodb&logoColor=white)
![TigerData](https://img.shields.io/badge/TigerData_·_TimescaleDB-e8833a)
![Meko](https://img.shields.io/badge/Meko_MCP-1b2430)

</div>

---

## The problem

It's 7:42 pm at Sharma Dental Clinic. The doctor is with a patient and the phone rings: a new patient who wants a ₹1,200 cleaning. Nobody picks up, so they call the clinic next door.

In most small Indian businesses the owner is also the receptionist. Clinics, salons, sweet shops and coaching centres lose calls every day simply because hands are busy. Hiring a receptionist costs more than many of them earn in a month, and English-only voice bots don't work for callers who speak Hindi or switch languages mid-sentence.

## What Pratihar does

| | |
|---|---|
| 🗣️ **Set up by talking** | The owner briefs Pratihar like a new receptionist, hands-free, in English, Hindi or Hinglish. A job card (prices, hours, rules, emergency contact) fills in live. |
| 🧪 **Practises before going live** | 8 tricky situations × 3 runs = 24 test calls, each graded against a written expectation. |
| ✍️ **Fix in one sentence** | "If it isn't on my list, don't guess." The fix becomes a rule *and* a permanent test. |
| 📞 **Real calls, real bookings** | Quotes only listed prices, checks the calendar, books with a signed booking ID. |
| 🚨 **Urgency + memory** | Pain or bleeding marks the call urgent and hands it to the owner; returning callers are recognised. |
| 📋 **Nothing slips through** | Callback list, evening brief, calls-by-hour reports. |
| 🔗 **One link to try it** | Every business gets `/c/<id>`: anyone can call the receptionist from a browser, or share it on WhatsApp. |

## Demo

<a href="https://pratihar.vercel.app/video/pratihar-en.mp4"><img src="public/video/pratihar-en.jpg" alt="Play the English demo" width="49%" /></a>
<a href="https://pratihar.vercel.app/video/pratihar-hi.mp4"><img src="public/video/pratihar-hi.jpg" alt="हिंदी डेमो चलाइए" width="49%" /></a>

72 seconds, 1080p, narrated by an ElevenLabs Indian voice in both languages. The videos are also on the landing page with an English/हिंदी toggle.

## Screenshots

<table>
<tr>
<td width="50%"><img src="docs/screens/landing.png" alt="Landing page" /><br/><sub><b>Landing</b>: plain words, Hindi/English toggle</sub></td>
<td width="50%"><img src="docs/screens/home.png" alt="Owner home" /><br/><sub><b>Home</b>: five steps, test-call link, everything one tap away</sub></td>
</tr>
<tr>
<td><img src="docs/screens/explain.png" alt="Explain by talking" /><br/><sub><b>1 · Explain</b>: hands-free Hinglish interview, card fills in on the right</sub></td>
<td><img src="docs/screens/card.png" alt="Job card" /><br/><sub><b>2 · Check card</b>: unknown prices stay empty and become callbacks</sub></td>
</tr>
<tr>
<td><img src="docs/screens/practice.png" alt="Practice" /><br/><sub><b>3 · Practice</b>: 8 situations × 3 runs on a scratch calendar</sub></td>
<td><img src="docs/screens/fix.png" alt="Fix" /><br/><sub><b>4 · Fix</b>: one sentence becomes a rule and a regression test</sub></td>
</tr>
<tr>
<td><img src="docs/screens/golive.png" alt="Go live" /><br/><sub><b>5 · Go live</b>: versioned, gated on practice results, one-click rollback</sub></td>
<td><img src="docs/screens/talk.png" alt="Public call page" /><br/><sub><b>Call page</b>: what a caller sees at <code>/c/&lt;id&gt;</code>, no login</sub></td>
</tr>
<tr>
<td><img src="docs/screens/calls.png" alt="Calls" /><br/><sub><b>Calls</b>: outcomes, bookings, people to call back</sub></td>
<td><img src="docs/screens/calendar.png" alt="Appointments" /><br/><sub><b>Appointments</b>: the slot Rahul booked on the call</sub></td>
</tr>
<tr>
<td><img src="docs/screens/insights.png" alt="Insights" /><br/><sub><b>Insights</b>: daily brief and reports, read from TigerData</sub></td>
<td><img src="docs/screens/security.png" alt="Safety log" /><br/><sub><b>Safety log</b>: every tool call and whether the guard allowed it</sub></td>
</tr>
</table>

## How it works

```mermaid
flowchart LR
  Owner(("Owner")) -->|talks| STT["ElevenLabs Scribe<br/>speech → text"]
  Caller(("Caller")) -->|browser link / phone| STT
  STT --> Brain["Gemini<br/>interview · receptionist · judge"]
  Brain -->|function calls| Guard{"Guard<br/>src/lib/guard.ts"}
  Guard -->|check / book| Mongo[("MongoDB Atlas<br/>businesses · versions<br/>appointments · calls · audit")]
  Guard -->|search docs, recall caller| Meko[("Meko MCP<br/>knowledge base · memory")]
  Brain --> TTS["ElevenLabs TTS<br/>Indian female voice, streamed"]
  TTS --> Caller
  Mongo -->|call ended| Tiger[("TigerData<br/>call_events hypertable<br/>call_hourly aggregate")]
  Tiger --> Reports["Insights · evening brief"]
```

### A call, step by step

1. The caller speaks. The browser detects the pause itself (voice-activity detection with a noise-floor calibration), so nobody holds a button.
2. **ElevenLabs Scribe** transcribes with a language hint (`hin` / `eng`) so Hindi isn't forced into English words.
3. **Gemini** runs the receptionist with function calling: `check_availability`, `book_appointment`, `verify_booking`, `log_callback`, `search_knowledge`, `identify_caller`, `handoff_to_human`.
4. Every tool call passes the **guard** before it touches data (below).
5. The reply is spoken by **ElevenLabs Flash v2.5**, streamed so playback starts on the first bytes.
6. When the call ends, a summary is written in the background (`after()`), the caller's history goes to **Meko**, and the call's events go to **TigerData**.

## How each sponsor tech is used

### 🐯 TigerData (TimescaleDB): call analytics

Every finished call becomes a set of time-stamped events (`call_completed`, `booking`, `callback`, `handoff`, `urgent`, `injection`, `tool_denied`, `tool_failed`) in a **hypertable**, following Tiger's hypertable guide ([`src/lib/tiger.ts`](src/lib/tiger.ts)):

```sql
CREATE TABLE call_events (
  time TIMESTAMPTZ NOT NULL, business_id TEXT NOT NULL, call_id TEXT NOT NULL,
  kind TEXT NOT NULL, version INT, channel TEXT, intent TEXT, outcome TEXT,
  sentiment DOUBLE PRECISION, duration_s INT
) WITH (
  tsdb.hypertable, tsdb.partition_column = 'time',
  tsdb.enable_columnstore = true,      -- compressed columnar storage
  tsdb.segmentby = 'business_id',      -- every query filters by business
  tsdb.orderby = 'time DESC'
);
```

The dashboard never scans raw rows. It reads an hourly **continuous aggregate**, refreshed every 15 minutes, with `materialized_only = false` so the latest calls show up immediately:

```sql
CREATE MATERIALIZED VIEW call_hourly WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT time_bucket('1 hour', time) AS bucket, business_id, version, intent, outcome,
       count(*) AS calls, sum(duration_s) AS duration_s,
       count(*) FILTER (WHERE sentiment < -0.2) AS unhappy
FROM call_events WHERE kind = 'call_completed'
GROUP BY bucket, business_id, version, intent, outcome;
```

Insights, the calls-by-hour chart, version comparisons and the evening brief all come from `call_hourly`. Because rows carry the receptionist `version`, an owner can see whether a fix actually changed outcomes. The connection verifies TLS, and on TimescaleDB older than 2.20 the schema falls back to `create_hypertable`. Run `npm run check:tiger` to test it end to end.

### 🧠 Meko (MCP): knowledge base and caller memory

Pratihar talks to Meko over the **Model Context Protocol** (`@modelcontextprotocol/sdk`, [`src/lib/meko.ts`](src/lib/meko.ts)) and uses three of its abilities:

| Meko tool | When | What for |
|---|---|---|
| `knowledgebase_upload_document` | Owner uploads a price list / FAQ ([`knowledge.ts`](src/lib/knowledge.ts)) | Each line is tagged `[biz:<id>]` so one datapack serves every business safely |
| `knowledgebase_search` | Receptionist calls `search_knowledge` mid-call | Answers "root canal kitna?" only from the owner's own documents, filtered to that business |
| `memory_add` / `memory_search` | Call ends / next call starts | "Rahul, last visit 3 Oct, cleaning": returning callers are greeted by name |

Each call turn is also logged to Meko (`mekoLogTurn`). Recall is raced against 3.5 s so a slow lookup never stalls a live caller, and MongoDB call history fills in when Meko is slow. Practice calls run under the owner's id, so test calls search the real documents without polluting caller memory.

### 🍃 MongoDB Atlas: the system of record

Businesses, card **versions** (live/rollback is a pointer move), appointments, calls, callbacks, sessions and the audit log. Double booking is impossible at the database level: a **unique partial index** on `{businessId, start}` where `status = "booked"` means two racing inserts can't both succeed.

### 🗣️ ElevenLabs: voice in and out

- **Scribe** speech-to-text, with a Hindi/English hint from the chosen language.
- **Flash v2.5** text-to-speech, streamed (`/stream` + a GET endpoint the `<audio>` element plays progressively).
- Hand-picked young Indian female voices (default **Sia**, plus Simran, Anjali, Zara, Saavi, Pyaari) that switch between Hindi and English naturally.
- **Conversational AI agent** for a real phone/SIP number: its tools call `/api/tools/<business>/<tool>` through the same guard, and the post-call webhook is HMAC-verified.

### ✨ Gemini: the brain

Interview, job-card extraction, the receptionist (function calling), the practice judge, coaching fixes and call summaries. Every model output is validated with **Zod**. Calls are **hedged** across several Gemini models ([`gemini.ts`](src/lib/gemini.ts)): if the first hasn't answered in 3.5 s, or is out of quota, the next starts in parallel and the first good answer wins.

## Guarantees enforced in code, not in the prompt

- **No invented slots.** `book_appointment` is refused unless `check_availability` offered that exact time in the same call.
- **No fake bookings.** Booking IDs carry an HMAC signature; a made-up ID fails before any lookup.
- **No double booking.** Unique partial index in MongoDB.
- **No guessed prices.** A price the owner didn't give stays `null`, and the receptionist offers a callback instead.
- **Prompt injection.** "Ignore your rules" in English or Hinglish is flagged, logged and shown in the safety log; permissions live in server session state the model can't write.
- **Urgency.** Pain or emergency words in Hindi or English mark the call urgent and push toward handoff.
- **Outcomes come from tool results.** A call is "booked" only if `book_appointment` actually returned ok.
- **Owner data is private.** scrypt password hashes, hashed session tokens, and every `/api/businesses/*` route checks ownership.

## Run it locally

```bash
git clone https://github.com/24f3004981/Pratihar.git && cd Pratihar
cp .env.example .env.local      # add GEMINI_API_KEY and ELEVENLABS_API_KEY at minimum
npm install
npm run dev                     # http://localhost:3000
```

Everything else is optional and degrades gracefully: with no `MONGODB_URI` an in-memory MongoDB starts, with no `TIGER_DATABASE_URL` reports are computed from Mongo, and with no `MEKO_API_KEY` documents are searched in Mongo only.

```bash
npm test                         # guard, booking-ID and auth tests
npm run typecheck
npm run check:db                 # MongoDB connection + indexes
npm run check:tiger              # TigerData hypertable + continuous aggregate
npx tsx scripts/flow-e2e.ts      # full owner → caller → reports flow against a running app
```

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY`, `GEMINI_MODEL` | The brain (first model tried; others are hedged automatically) |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` | Speech in and out, default voice |
| `MONGODB_URI`, `MONGODB_DB` | System of record |
| `TIGER_DATABASE_URL` | Call analytics |
| `MEKO_API_KEY`, `MEKO_DATAPACK_ID`, `MEKO_MCP_URL` | Knowledge base and caller memory |
| `PUBLIC_URL`, `BOOKING_SECRET`, `TOOLS_SECRET`, `ELEVENLABS_WEBHOOK_SECRET` | Phone agent, signed booking IDs, tool and webhook auth |

### Put it on a real phone number

Going live publishes the version to an ElevenLabs agent when `PUBLIC_URL` is public. Attach a Twilio or SIP number to the agent in ElevenLabs and point its post-call webhook at `/api/webhooks/elevenlabs`.

### Put it on a website

```html
<script src="https://pratihar.vercel.app/embed.js" data-business="BUSINESS_ID" async></script>
```

## Project layout

```
src/app/            pages: landing, /login, /app/[id] workspace, /talk/[id] call page, /c/[id] short link
src/app/api/        auth, businesses, interview, draft, talk, stt, tts, tools, webhooks, insights
src/components/     Phone (hands-free call), useVoice (VAD + streaming TTS), desk/* workspace screens
src/lib/            agent, guard, calendar, gemini, eleven, meko, tiger, interview, trial, calls
scripts/            e2e flows, DB checks, model timing, README screenshots
tests/              guard and auth tests
```

## What's next

- Password reset by email, and teammates sharing one business.
- Login and rate-limit counters live in memory; move them to Mongo or Redis before running several servers.
- Call recordings aren't stored (transcripts, duration and sentiment are).
- Time handling assumes India (+05:30).

<div align="center"><sub>Built for small businesses that can't afford to miss a call.</sub></div>
