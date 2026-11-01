# Pratihar

A receptionist for Indian clinics, salons and small shops. She answers calls in Hindi, English or Hinglish, books appointments, and tells the owner who still needs a call back.

The owner sets her up by talking to her. Before she takes a real call, she practises on 24 test calls, and every mistake the owner corrects becomes a permanent test.

## The flow

1. **Explain.** The owner talks or types to Pratihar, which interviews them that asks one question at a time (Gemini).
2. **Card.** Pratihar turns the interview into a job card: services, prices, hours, rules, emergency policy. Prices the owner didn't give stay `null`, and the receptionist will never invent them.
3. **Practice.** Trial Day runs 8 hard situations three times each (unlisted price, emergency, double booking, prompt injection, Hinglish booking, "are you human?", after-hours, fake booking ID). Each run gets its own scratch calendar. A second Gemini call grades every transcript against a written expectation.
4. **Fix.** The owner writes one sentence. Pratihar turns it into a rule, writes a regression test, saves a new version and reruns Trial Day.
5. **Go live.** Only a version with ≥90% pass rate, and every coached test passing all three times, can go live. Rollback just moves a pointer.
6. **Calls, Calendar, Insights, Documents, Guard log** are for running the business afterwards.

## What runs where

| Piece | Job |
| --- | --- |
| Gemini 2.5 Flash | Interview, job card extraction, the receptionist (function calling), Trial Day judge, coaching, call summaries |
| ElevenLabs | Scribe speech-to-text, Flash v2.5 text-to-speech with Indian female voices (default "Pyaari"), Conversational AI agent for phone/SIP, post-call webhook |
| MongoDB Atlas | Businesses, versions, appointments, calls, callbacks, audit log, document chunks |
| TigerData (TimescaleDB) | `call_events` hypertable plus a `call_hourly` continuous aggregate for the Insights screen |
| Meko (MCP) | Knowledge base for uploaded documents, memory of returning callers, per-call conversation log |
| Zod | Every API body, every model output, every tool argument |
| Three.js | The audio-reactive orb on the call screen |

## Guarantees enforced in code, not in the prompt

- **No double booking.** A unique partial index on `{businessId, start}` where `status = "booked"`. Two racing inserts can't both succeed.
- **No invented slots.** `book_appointment` is refused unless that exact start time was returned by `check_availability` in the same call (`src/lib/guard.ts`).
- **No fake bookings.** Booking IDs carry an HMAC suffix, so a made-up ID fails before any lookup.
- **Clean arguments.** Phone numbers are normalised to 10 digits, control characters are stripped, dates are validated, and there are per-call and per-number booking limits.
- **Prompt injection.** English and Hinglish patterns are flagged, a `[guard]` note is attached to the turn, and the attempt is written to the audit log. Callers can't change permissions because the guard reads session state the model can't write to.
- **Urgency.** Emergency words in Hindi or English mark the call urgent and push the agent toward handoff.
- **Outcomes come from tool results.** A call counts as "booked" only if `book_appointment` returned ok, whatever the model said.

## Run it

```bash
cp .env.example .env.local   # add GEMINI_API_KEY and ELEVENLABS_API_KEY at minimum
npm install
npm run dev
```

If `MONGODB_URI` is empty, dev mode starts an in-memory MongoDB (the first run downloads it, about 66 MB). If `TIGER_DATABASE_URL` is empty, Insights computes the same numbers from Mongo. If `MEKO_API_KEY` is empty, documents are searched from Mongo only.

```bash
npm test         # guard, calendar and booking-ID tests
npm run typecheck
```

### Phone line

Going live publishes the version to an ElevenLabs agent when `ELEVENLABS_API_KEY` is set and `PUBLIC_URL` is a public address. Its tools call `/api/tools/<business>/<tool>`, which goes through the same guard and calendar as the web line. Attach a Twilio or SIP number to the agent in ElevenLabs, then point its post-call webhook at `/api/webhooks/elevenlabs` with `ELEVENLABS_WEBHOOK_SECRET` set.

### Website widget

```html
<script src="https://your-pratihar-host/embed.js" data-business="BUSINESS_ID" async></script>
```

## Accounts and access

Owners sign up at `/login` with an email and password. Passwords are hashed with scrypt, and the session cookie is a random token stored only as a hash. Every `/api/businesses/*` and `/api/runs/*` route checks that the business belongs to the signed-in owner. The public pieces are the call page `/talk/<id>`, the widget, speech in and out (rate-limited per visitor), and the phone tool webhooks, which need the `TOOLS_SECRET` header ElevenLabs sends.

## Not done yet

- Password reset by email, and teammates sharing one business.
- Login and rate-limit counters are in memory, which is fine for one server. Move them to Mongo or Redis before running several.
- Call recordings aren't stored. Transcripts, duration and sentiment are.
- Time handling assumes India (+05:30, no daylight saving).
