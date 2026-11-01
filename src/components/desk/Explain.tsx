"use client";
import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { api } from "../fetcher";
import { Icon } from "../Icon";
import { useT } from "../lang";
import { useVoice } from "../useVoice";
import { PageHead } from "./ui";
import type { JobCard, TabProps } from "./types";
import type { Turn } from "@/lib/types";

type Lang = "en" | "hi" | "hinglish";
type Phase = "idle" | "speaking" | "listening" | "thinking";
type Reply = { interview: Turn[]; done: boolean; draft: JobCard | null; gaps: string[]; version: number | null };

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY: Record<string, [string, string]> = { mon: ["Mon", "सोम"], tue: ["Tue", "मंगल"], wed: ["Wed", "बुध"], thu: ["Thu", "गुरु"], fri: ["Fri", "शुक्र"], sat: ["Sat", "शनि"], sun: ["Sun", "रवि"] };

export default function Explain({ data, reload, go }: TabProps) {
  const { t, lang: siteLang } = useT();
  const v = useVoice();
  const sp = useSearchParams();
  const id = data.business._id;
  const [turns, setTurns] = useState<Turn[]>(data.business.interview);
  const [draft, setDraft] = useState<JobCard | null>(data.business.draft ?? data.business.card);
  const [lang, setLang] = useState<Lang>(siteLang === "hi" ? "hi" : "en");
  const [phase, setPhase] = useState<Phase>("idle");
  const [handsFree, setHandsFree] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [heard, setHeard] = useState("");
  const running = useRef(false);
  const log = useRef<HTMLDivElement>(null);
  const autoStarted = useRef(false);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [turns, phase]);
  useEffect(() => () => {
    running.current = false;
    v.hush();
    v.releaseMic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(msg?: string, reset = false): Promise<Reply | null> {
    setPhase("thinking");
    setErr("");
    if (msg) setTurns((x) => [...x, { role: "owner", text: msg }]);
    try {
      const r = await api<Reply>(`/api/businesses/${id}/interview`, { method: "POST", json: { text: msg, reset, lang } });
      setTurns(r.interview);
      if (r.draft) setDraft(r.draft);
      if (r.done) {
        setDone(true);
        await reload();
      } else if (msg) {
        // refresh the card on the right without holding up the conversation
        void api<{ draft: JobCard | null }>(`/api/businesses/${id}/draft`, { method: "POST" })
          .then((d) => d.draft && setDraft(d.draft))
          .catch(() => {});
      }
      return r;
    } catch (e) {
      setErr((e as Error).message);
      return null;
    } finally {
      setPhase("idle");
    }
  }

  async function say(line: string) {
    setPhase("speaking");
    await v.speak(line, data.business.voiceId);
    setPhase("idle");
  }

  /** The hands-free loop: Pratihar speaks, then listens, then replies, until done or stopped. */
  async function startTalking() {
    setErr("");
    setHandsFree(true);
    running.current = true;
    let last = turns[turns.length - 1];
    if (!turns.length) {
      const r = await send();
      last = r?.interview[r.interview.length - 1] as Turn;
    }
    if (running.current && last?.role === "assistant") await say(last.text);
    let quiet = 0;
    while (running.current) {
      setPhase("listening");
      setHeard("");
      let said = "";
      try {
        said = (await v.listen()).trim();
      } catch (e) {
        setErr((e as Error).message);
      }
      if (!running.current) break;
      if (!said) {
        if (++quiet >= 3) {
          setErr(t("I didn't hear anything for a while, so I've paused. Tap Start talking when you're ready.", "काफ़ी देर से कुछ सुनाई नहीं दिया, इसलिए रोक दिया। तैयार हों तो 'बोलना शुरू करें' दबाइए।"));
          break;
        }
        continue;
      }
      quiet = 0;
      setHeard(said);
      const r = await send(said);
      if (!r || !running.current) break;
      await say(r.interview[r.interview.length - 1].text);
      if (r.done) break;
    }
    stopTalking();
  }

  function stopTalking() {
    running.current = false;
    v.stopListening();
    v.hush();
    v.releaseMic();
    setHandsFree(false);
    setPhase("idle");
  }

  useEffect(() => {
    if (sp.get("start") === "voice" && !autoStarted.current && !data.business.card) {
      autoStarted.current = true;
      void startTalking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function typed(e: React.FormEvent) {
    e.preventDefault();
    const m = text.trim();
    if (!m || phase === "thinking") return;
    setText("");
    await send(m);
  }

  async function startOver() {
    if (!confirm(t("Start the interview over?", "इंटरव्यू फिर से शुरू करें?"))) return;
    stopTalking();
    setTurns([]);
    setDraft(null);
    setDone(false);
    await send(undefined, true);
  }

  const status: Record<Phase, string> = {
    idle: handsFree ? t("Starting…", "शुरू हो रहा है…") : "",
    speaking: t("Pratihar is asking…", "प्रतिहार पूछ रहा है…"),
    listening: t("Listening… just speak, it sends when you pause", "सुन रहा है… बस बोलिए, रुकते ही भेज देगा"),
    thinking: t("Writing it down…", "लिख रहा है…"),
  };

  const filled = {
    about: !!draft?.businessName && !!draft?.kind,
    prices: !!draft?.services.length,
    hours: DAYS.some((d) => draft?.hours[d]?.length),
    rules: !!draft?.rules.length,
    emergency: !!draft?.emergency || !!draft?.handoffPhone,
  };

  return (
    <>
      <PageHead title={t("Explain the job", "काम समझाइए")} sub={t("Just talk, like you'd brief a new receptionist. Pratihar asks, you answer, and your card fills in on the right.", "बस बात कीजिए, जैसे नए रिसेप्शनिस्ट को समझाते हैं। प्रतिहार पूछेगा, आप जवाब देंगे, और दाईं ओर आपका कार्ड भरता जाएगा।")} />

      <div className="explain">
        <section className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div className="row" style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", justifyContent: "space-between" }}>
            <div className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
              <span className="tile" style={{ borderRadius: 99, width: 34, height: 34 }}><Icon name="chat" size={16} /></span>
              <strong style={{ fontWeight: 500 }}>Pratihar</strong>
            </div>
            <div role="radiogroup" aria-label={t("Conversation language", "बातचीत की भाषा")} style={{ display: "inline-flex", padding: 3, borderRadius: 999, background: "var(--sunk)" }}>
              {([["en", "English"], ["hi", "हिंदी"], ["hinglish", "Hinglish"]] as const).map(([k, label]) => (
                <button key={k} role="radio" aria-checked={lang === k} onClick={() => setLang(k)} disabled={handsFree}
                  style={{ border: 0, cursor: "pointer", height: 30, padding: "0 12px", borderRadius: 999, fontSize: "0.85rem", background: lang === k ? "var(--surface)" : "transparent", boxShadow: lang === k ? "var(--shadow-sm)" : "none", color: lang === k ? "var(--ink)" : "var(--ink-2)" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div ref={log} className="col" style={{ flex: 1, padding: 18, gap: 10, overflowY: "auto", minHeight: 300, maxHeight: 460, background: "var(--bg)" }} aria-live="polite">
            {turns.length === 0 && phase === "idle" && (
              <div style={{ margin: "auto", textAlign: "center", maxWidth: 380, padding: "24px 0" }}>
                <p className="muted">{t("Pratihar will ask about six short questions. Choose your language above, then press the button below and just talk.", "प्रतिहार लगभग छह छोटे सवाल पूछेगा। ऊपर भाषा चुनिए, फिर नीचे बटन दबाकर बस बोलिए।")}</p>
              </div>
            )}
            {turns.map((x, i) => (
              <div key={i} className={`msg ${x.role === "owner" ? "me" : "them"} fade-in`}>{x.text}</div>
            ))}
            {phase === "thinking" && <div className="msg them"><span className="typing"><i /><i /><i /></span></div>}
          </div>

          <div style={{ borderTop: "1px solid var(--line)", padding: 16, background: "var(--surface)" }}>
            {done ? (
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="row small" style={{ gap: 8, color: "var(--pass)" }}><Icon name="check" size={16} /> {t("Done! Your card is saved.", "हो गया! आपका कार्ड सेव हो गया।")}</span>
                <button className="btn" onClick={() => go("card")}>{t("Check my card", "मेरा कार्ड देखें")} <Icon name="arrow" size={16} /></button>
              </div>
            ) : handsFree ? (
              <div className="row" style={{ gap: 14, flexWrap: "nowrap" }}>
                <span className={`mic-dot ${phase}`} aria-hidden><Icon name={phase === "listening" ? "mic" : phase === "speaking" ? "volume" : "chat"} size={20} /></span>
                <div className="grow">
                  <div style={{ fontWeight: 500 }}>{status[phase]}</div>
                  {heard && <div className="xs muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t("Heard", "सुना")}: “{heard}”</div>}
                </div>
                <button className="btn btn-outline" onClick={stopTalking}>{t("Stop", "रोकें")}</button>
              </div>
            ) : (
              <div className="col" style={{ gap: 10 }}>
                <button className="btn btn-block" style={{ height: 52 }} onClick={startTalking} disabled={phase === "thinking"}>
                  <Icon name="mic" size={18} /> {turns.length ? t("Continue talking", "बात जारी रखें") : t("Start talking", "बोलना शुरू करें")}
                </button>
                <form className="row" style={{ flexWrap: "nowrap", gap: 8 }} onSubmit={typed}>
                  <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("…or type your answer", "…या जवाब लिखिए")} aria-label={t("Your answer", "आपका जवाब")} />
                  <button className="btn btn-ink" style={{ width: 48, padding: 0, flex: "none" }} disabled={phase === "thinking" || !text.trim()} aria-label={t("Send", "भेजें")}><Icon name="arrow" size={18} /></button>
                </form>
              </div>
            )}
            {err && <p className="err" role="alert" style={{ marginTop: 10 }}>{err}</p>}
          </div>
        </section>

        <aside className="card" style={{ position: "sticky", top: 120, overflow: "hidden" }}>
          <div className="row" style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", justifyContent: "space-between" }}>
            <h3>{t("Your card", "आपका कार्ड")}</h3>
            <span className="badge">{t("fills in as you talk", "बात करते-करते भरता है")}</span>
          </div>
          <div className="col" style={{ padding: 18, gap: 14 }}>
            <Row ok={filled.about} label={t("Business", "बिज़नेस")}>
              {draft?.businessName ? <><strong style={{ fontWeight: 500 }}>{draft.businessName}</strong>{draft.kind ? ` · ${draft.kind}` : ""}{draft.city ? ` · ${draft.city}` : ""}</> : null}
            </Row>
            <Row ok={filled.prices} label={t("Prices", "रेट")}>
              {draft?.services.length ? (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
                  {draft.services.slice(0, 6).map((s) => (
                    <li key={s.name} className="row small" style={{ justifyContent: "space-between", gap: 8 }}>
                      <span>{s.name}</span>
                      <span className={s.price === null ? "faint" : ""}>{s.price === null ? t("ask staff", "स्टाफ़ बताएगा") : `₹${s.price.toLocaleString("en-IN")}`}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Row>
            <Row ok={filled.hours} label={t("Hours", "टाइमिंग")}>
              {filled.hours ? (
                <div className="small" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 10px" }}>
                  {DAYS.map((d) => (
                    <Fragment key={d}><span className="faint">{t(DAY[d][0], DAY[d][1])}</span><span>{draft!.hours[d]?.length ? draft!.hours[d]!.map((w) => `${w.open}–${w.close}`).join(", ") : t("closed", "बंद")}</span></Fragment>
                  ))}
                </div>
              ) : null}
            </Row>
            <Row ok={filled.rules} label={t("Rules", "नियम")}>
              {draft?.rules.length ? <ul style={{ margin: 0, paddingLeft: 16 }} className="small">{draft.rules.slice(0, 4).map((r) => <li key={r}>{r}</li>)}</ul> : null}
            </Row>
            <Row ok={filled.emergency} label={t("Emergency", "इमरजेंसी")}>
              {draft?.emergency || draft?.handoffPhone ? <span className="small">{draft?.emergency}{draft?.handoffPhone ? ` · ${draft.handoffPhone}` : ""}</span> : null}
            </Row>
          </div>
          {turns.length > 0 && !handsFree && (
            <div style={{ padding: "0 18px 16px" }}>
              <button className="btn btn-ghost btn-sm" onClick={startOver}><Icon name="undo" size={14} /> {t("Start over", "फिर से शुरू")}</button>
            </div>
          )}
        </aside>
      </div>
      <style>{`
        .explain{display:grid;gap:20px;grid-template-columns:minmax(0,1fr) 340px;align-items:start}
        @media(max-width:900px){.explain{grid-template-columns:1fr}.explain aside{position:static!important}}
        .typing{display:inline-flex;gap:4px}.typing i{width:6px;height:6px;border-radius:99px;background:var(--ink-3);animation:blink 1.2s infinite}
        .typing i:nth-child(2){animation-delay:.2s}.typing i:nth-child(3){animation-delay:.4s}
        @keyframes blink{0%,80%,100%{opacity:.25}40%{opacity:1}}
        .mic-dot{width:48px;height:48px;border-radius:99px;display:grid;place-items:center;flex:none;background:var(--sunk);color:var(--ink-2);transition:background-color .2s,color .2s}
        .mic-dot.listening{background:var(--brand);color:#fff;animation:breathe 1.6s ease-in-out infinite}
        .mic-dot.speaking{background:var(--gold-soft);color:var(--gold-ink)}
        @keyframes breathe{0%,100%{box-shadow:0 0 0 0 rgba(13,115,119,.35)}50%{box-shadow:0 0 0 10px rgba(13,115,119,0)}}
      `}</style>
    </>
  );
}

function Row({ ok, label, children }: { ok: boolean; label: string; children: React.ReactNode }) {
  return (
    <div className="row" style={{ alignItems: "flex-start", gap: 10, flexWrap: "nowrap" }}>
      <span style={{ width: 20, height: 20, marginTop: 2, borderRadius: 99, display: "grid", placeItems: "center", flex: "none", background: ok ? "var(--brand)" : "var(--sunk)", color: ok ? "#fff" : "var(--ink-3)", transition: "background-color .3s" }}>
        {ok ? <Icon name="check" size={12} /> : null}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="xs faint">{label}</div>
        {children ?? <div className="small faint">—</div>}
      </div>
    </div>
  );
}
