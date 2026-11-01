"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { api } from "./fetcher";
import { Icon } from "./Icon";
import { useT } from "./lang";
import { useVoice } from "./useVoice";

const Orb = dynamic(() => import("./Orb"), { ssr: false, loading: () => <div style={{ width: "min(240px, 60vw)", aspectRatio: "1", margin: "0 auto" }} /> });

type Line = { who: "them" | "me" | "note" | "bad"; text: string };
type TurnReply = {
  reply: string;
  urgent: boolean;
  handoff: { reason: string; phone: string | null } | null;
  bookings: string[];
  tools: { name: string; allowed: boolean; reason?: string }[];
};
type Phase = "idle" | "connecting" | "speaking" | "listening" | "thinking";

const TOOL: Record<string, [string, string]> = {
  check_availability: ["Checked the calendar", "कैलेंडर देखा"],
  book_appointment: ["Booked it in the calendar", "कैलेंडर में बुक किया"],
  log_callback: ["Asked staff to call back", "स्टाफ़ को कॉल बैक के लिए कहा"],
  search_knowledge: ["Looked in the price list", "रेट लिस्ट देखी"],
  identify_caller: ["Found your past visits", "पिछली विज़िट देखीं"],
  verify_booking: ["Checked the booking ID", "बुकिंग आईडी जाँची"],
  handoff_to_human: ["Calling a staff member", "स्टाफ़ को बुला रहे हैं"],
};

/**
 * A browser phone call. One tap to call; after that it behaves like a real call:
 * she speaks, listens, and answers when the caller pauses. No buttons to hold.
 */
export default function Phone({ businessId, practice = false, channel = "web" }: { businessId: string; practice?: boolean; channel?: "web" | "widget" }) {
  const { t, lang } = useT();
  const v = useVoice();
  const [callId, setCallId] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [err, setErr] = useState("");
  const [typed, setTyped] = useState("");
  const [ended, setEnded] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<TurnReply["handoff"]>(null);
  const [micOff, setMicOff] = useState(false);
  const [secs, setSecs] = useState(0);
  const log = useRef<HTMLDivElement>(null);
  const live = useRef<{ callId: string; voiceId?: string } | null>(null);
  const micOffRef = useRef(false);
  const busy = useRef(false);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [lines, phase]);
  useEffect(() => {
    if (!callId) return;
    const timer = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [callId]);
  // Closing the tab mid-call still ends the call properly, so it shows up in Calls and Reports.
  useEffect(() => {
    const bye = () => {
      if (!live.current) return;
      navigator.sendBeacon(`/api/talk/${businessId}/end`, new Blob([JSON.stringify({ callId: live.current.callId })], { type: "application/json" }));
    };
    window.addEventListener("pagehide", bye);
    return () => {
      window.removeEventListener("pagehide", bye);
      bye();
      v.releaseMic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function speakLine(text: string) {
    setPhase("speaking");
    await v.speak(text, live.current?.voiceId);
  }

  async function turn(text: string): Promise<boolean> {
    const c = live.current;
    if (!c || !text.trim() || busy.current) return false;
    busy.current = true;
    v.hush();
    setLines((l) => [...l, { who: "me", text }]);
    setPhase("thinking");
    setErr("");
    try {
      const r = await api<TurnReply>(`/api/talk/${businessId}`, { method: "POST", json: { callId: c.callId, text } });
      const notes: Line[] = r.tools.map((x) =>
        x.allowed ? { who: "note", text: (TOOL[x.name] ?? [x.name, x.name])[lang === "hi" ? 1 : 0] } : { who: "bad", text: `${t("Safety check stopped", "सुरक्षा जाँच ने रोका")}: ${x.reason}` },
      );
      setLines((l) => [...l, ...notes, { who: "them", text: r.reply }]);
      if (r.handoff) setHandoff(r.handoff);
      if (live.current) await speakLine(r.reply);
      return true;
    } catch (e) {
      setErr((e as Error).message);
      return false;
    } finally {
      busy.current = false;
    }
  }

  /** The call itself: listen, answer, repeat, until someone hangs up. */
  async function loop() {
    let quiet = 0;
    while (live.current) {
      if (micOffRef.current) {
        setPhase("idle");
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }
      setPhase("listening");
      let said = "";
      try {
        said = (await v.listen({ pauseMs: 1100, waitMs: 10000 })).trim();
      } catch (e) {
        setErr((e as Error).message);
      }
      if (!live.current) break;
      if (!said) {
        if (++quiet === 2) await speakLine(t("Are you still there?", "क्या आप लाइन पर हैं?"));
        if (quiet >= 4) {
          await speakLine(t("I'll end the call for now. Please call again anytime.", "अभी के लिए कॉल रख रही हूँ। कभी भी दोबारा कॉल कीजिए।"));
          await hangUp();
          break;
        }
        continue;
      }
      quiet = 0;
      await turn(said);
    }
  }

  async function begin() {
    setErr("");
    setEnded(null);
    setLines([]);
    setHandoff(null);
    setSecs(0);
    setPhase("connecting");
    try {
      // ask for the mic first so a blocked mic is reported before anything else happens
      await v.listen({ waitMs: 1, maxMs: 1 }).catch(() => {
        throw new Error(t("The microphone is blocked. Allow it in your browser to talk, or type below.", "माइक बंद है। बात करने के लिए ब्राउज़र में अनुमति दीजिए, या नीचे लिखिए।"));
      });
      const r = await api<{ callId: string; reply: string; voiceId: string }>(`/api/talk/${businessId}`, { method: "POST", json: { practice, channel } });
      live.current = { callId: r.callId, voiceId: r.voiceId };
      setCallId(r.callId);
      setLines([{ who: "them", text: r.reply }]);
      await speakLine(r.reply);
      void loop();
    } catch (e) {
      setErr((e as Error).message);
      setPhase("idle");
      v.releaseMic();
    }
  }

  async function hangUp() {
    const c = live.current;
    if (!c) return;
    live.current = null;
    v.stopListening();
    v.hush();
    v.releaseMic();
    setCallId(null);
    setPhase("idle");
    try {
      const r = await api<{ outcome?: string; practice?: boolean }>(`/api/talk/${businessId}/end`, { method: "POST", json: { callId: c.callId } });
      setEnded(r.practice ? t("Practice call over. Nothing was saved.", "प्रैक्टिस कॉल खत्म। कुछ सेव नहीं हुआ।") : t("Call ended. Thanks for calling.", "कॉल खत्म। कॉल करने के लिए धन्यवाद।"));
    } catch {
      setEnded(t("Call ended.", "कॉल खत्म।"));
    }
  }

  function toggleMic() {
    const next = !micOffRef.current;
    micOffRef.current = next;
    setMicOff(next);
    if (next) v.stopListening();
  }

  const status: Record<Phase, string> = {
    idle: callId ? (micOff ? t("Your mic is muted", "आपका माइक बंद है") : "") : "",
    connecting: t("Connecting…", "जोड़ रहे हैं…"),
    speaking: t("Pratihar is speaking", "प्रतिहार बोल रही है"),
    listening: t("Listening… go ahead and speak", "सुन रही है… बोलिए"),
    thinking: t("One moment…", "एक पल…"),
  };
  const orbState = phase === "listening" ? "listening" : phase === "thinking" || phase === "connecting" ? "thinking" : phase === "speaking" ? "speaking" : "idle";

  return (
    <div className="col" style={{ gap: 14 }}>
      <div style={{ textAlign: "center" }}>
        <Orb level={v.level} state={orbState} />
        <div className="row small" style={{ justifyContent: "center", gap: 8, minHeight: 24, marginTop: 4, color: "var(--ink-2)" }}>
          {callId && <span className="dot live" />}
          {status[phase]}
          {callId && <span className="mono faint">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span>}
        </div>
      </div>

      {handoff && (
        <div className="row fade-in" role="alert" style={{ gap: 10, padding: "12px 14px", borderRadius: 12, background: "var(--gold-soft)", border: "1px solid #f3d3b8", flexWrap: "nowrap" }}>
          <Icon name="users" size={18} style={{ color: "var(--gold-ink)" }} />
          <div className="grow small">
            <strong style={{ fontWeight: 600 }}>{t("Connecting you to the team", "टीम से जोड़ रहे हैं")}</strong>
            <div className="muted">{handoff.phone ? <a href={`tel:${handoff.phone}`}>{handoff.phone}</a> : t("Someone will call you back very soon.", "कोई जल्द ही कॉल करेगा।")}</div>
          </div>
        </div>
      )}

      <div ref={log} className="col" style={{ gap: 8, maxHeight: 320, minHeight: lines.length ? 120 : 0, overflowY: "auto", padding: 2 }} aria-live="polite">
        {lines.map((l, i) =>
          l.who === "note" || l.who === "bad" ? (
            <div key={i} className={`msg note ${l.who === "bad" ? "bad" : ""} fade-in row`} style={{ gap: 6, display: "inline-flex", alignSelf: "center" }}>
              <Icon name={l.who === "bad" ? "lock" : "check"} size={12} /> {l.text}
            </div>
          ) : (
            <div key={i} className={`msg ${l.who} fade-in`}>{l.text}</div>
          ),
        )}
        {phase === "thinking" && <div className="msg them"><span className="faint">…</span></div>}
      </div>

      {err && <p className="err" role="alert" style={{ textAlign: "center" }}>{err}</p>}
      {ended && <p className="small muted" style={{ textAlign: "center" }}>{ended}</p>}

      {!callId ? (
        <button className="btn" style={{ alignSelf: "center", height: 56, padding: "0 32px", borderRadius: 999 }} onClick={begin} disabled={phase === "connecting"}>
          {phase === "connecting" ? <span className="spin" /> : <Icon name="phone" size={18} />}
          {practice ? t("Start a practice call", "प्रैक्टिस कॉल शुरू करें") : ended ? t("Call again", "फिर से कॉल करें") : t("Call now", "अभी कॉल करें")}
        </button>
      ) : (
        <>
          <div className="row" style={{ justifyContent: "center", gap: 20 }}>
            <button className="round" onClick={toggleMic} aria-pressed={micOff} aria-label={micOff ? t("Unmute mic", "माइक चालू") : t("Mute mic", "माइक बंद")} data-on={micOff}>
              <Icon name={micOff ? "mute" : "mic"} size={22} />
            </button>
            <button className="round end" onClick={hangUp} aria-label={t("Hang up", "कॉल काटें")}>
              <Icon name="hangup" size={24} />
            </button>
          </div>
          <form
            className="row"
            style={{ flexWrap: "nowrap", gap: 8 }}
            onSubmit={(e) => {
              e.preventDefault();
              const x = typed;
              setTyped("");
              v.stopListening();
              void turn(x);
            }}
          >
            <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t("Can't talk? Type here", "बोल नहीं सकते? यहाँ लिखिए")} aria-label={t("Message", "संदेश")} />
            <button className="btn btn-ink" style={{ width: 48, padding: 0, flex: "none" }} disabled={!typed.trim()} aria-label={t("Send", "भेजें")}>
              <Icon name="arrow" size={18} />
            </button>
          </form>
        </>
      )}
      <style>{`
        .round{width:60px;height:60px;border-radius:999px;border:1px solid var(--line-2);background:var(--surface);color:var(--ink-2);display:grid;place-items:center;cursor:pointer;transition:background-color .15s,transform .1s}
        .round:hover{background:var(--sunk)}
        .round:active{transform:scale(.96)}
        .round[data-on=true]{background:var(--ink);color:#fff;border-color:var(--ink)}
        .round.end{width:68px;height:68px;background:var(--fail);border-color:var(--fail);color:#fff}
      `}</style>
    </div>
  );
}
