"use client";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "../Icon";
import { useT } from "../lang";

type Step = { who: "ring" | "ai" | "caller" | "tool" | "end"; en: string; hi: string; icon?: IconName; fx?: "urgent" | "repeat" | "booked" | "brief" };

const STEPS: Step[] = [
  { who: "ring", en: "Incoming call · +91 98100 22310 · 7:42 pm", hi: "आती कॉल · +91 98100 22310 · शाम 7:42" },
  { who: "ai", en: "Namaste, Sharma Dental. I'm the clinic's AI receptionist. How can I help?", hi: "नमस्ते, शर्मा डेंटल। मैं क्लिनिक की AI रिसेप्शनिस्ट हूँ। बताइए?" },
  { who: "caller", en: "Mere bete ke daant mein bahut dard hai. Aaj dikha sakte hain?", hi: "मेरे बेटे के दाँत में बहुत दर्द है। आज दिखा सकते हैं?" },
  { who: "tool", en: "Pain mentioned. Call marked urgent.", hi: "दर्द की बात। कॉल ज़रूरी मार्क हुई।", icon: "alert", fx: "urgent" },
  { who: "tool", en: "Returning caller: Rahul, last visit 3 Oct.", hi: "पुराने ग्राहक: राहुल, पिछली बार 3 अक्टूबर।", icon: "userCheck", fx: "repeat" },
  { who: "ai", en: "Rahul ji, today 5:30 pm is free. Shall I book it for your son?", hi: "राहुल जी, आज शाम 5:30 खाली है। बेटे के लिए बुक कर दूँ?" },
  { who: "caller", en: "Haan. Aur root canal kitne ka hoga?", hi: "हाँ। और रूट कैनाल कितने का होगा?" },
  { who: "tool", en: "Searched the price list. Root canal has no fixed price.", hi: "रेट लिस्ट देखी। रूट कैनाल का रेट तय नहीं।", icon: "file" },
  { who: "ai", en: "Booked for 5:30, ID PRT-7HQ2MX. The doctor will confirm the root canal price, so I've asked her to call you.", hi: "5:30 बुक हो गया, आईडी PRT-7HQ2MX। रूट कैनाल का रेट डॉक्टर बताएँगी, उन्हें कॉल बैक के लिए कह दिया है।", fx: "booked" },
  { who: "end", en: "Call ended · 1 min 12 sec", hi: "कॉल खत्म · 1 मिनट 12 सेकंड", fx: "brief" },
];

const SLOTS = ["4:00", "4:30", "5:00", "5:30", "6:00"];

export function Walkthrough() {
  const { lang: siteLang } = useT();
  const [lang, setLang] = useState<"en" | "hi">(siteLang);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => setLang(siteLang), [siteLang]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setPlaying(true), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!playing) return;
    if (i >= STEPS.length - 1) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setI(i + 1), STEPS[i].who === "tool" ? 1400 : 2300);
    return () => clearTimeout(id);
  }, [playing, i]);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [i]);

  const tr = (en: string, hi: string) => (lang === "hi" ? hi : en);
  const has = (fx: Step["fx"]) => STEPS.slice(0, i + 1).some((s) => s.fx === fx);

  return (
    <section id="how" style={{ background: "#1b2430", color: "#fff", scrollMarginTop: 64 }}>
      <div className="container" style={{ padding: "80px 24px" }} ref={box}>
        <h2 style={{ color: "#fff" }}>{tr("See Pratihar in 60 seconds", "60 सेकंड में प्रतिहार देखिए")}</h2>
        <p style={{ color: "#aab4c0", marginTop: 10 }}>{tr("A real call, start to finish. Left is what the caller hears. Right is what you see.", "एक असली कॉल, शुरू से अंत तक। बाएँ जो कॉलर सुनता है, दाएँ जो आप देखते हैं।")}</p>
        <div className="row" style={{ marginTop: 20, gap: 8 }}>
          {(["en", "hi"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className="row"
              style={{ gap: 6, height: 34, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontSize: "0.88rem", border: "1px solid #3a4553", background: lang === l ? "#fff" : "transparent", color: lang === l ? "var(--ink)" : "#d5dbe2" }}
            >
              <Icon name="volume" size={14} /> {l === "en" ? "English" : "हिंदी"}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 20, marginTop: 28, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          {/* caller side */}
          <div style={{ background: "#243040", border: "1px solid #334050", borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div className="row" style={{ padding: "14px 18px", borderBottom: "1px solid #334050", color: "#aab4c0", fontSize: "0.78rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Sharma Dental Clinic · Indirapuram
            </div>
            <div ref={log} className="col" style={{ padding: 18, gap: 10, height: 380, overflowY: "auto" }} aria-live="polite">
              {STEPS.slice(0, i + 1).map((s, k) =>
                s.who === "ai" || s.who === "caller" ? (
                  <div key={k} className="fade-in" style={{ maxWidth: "86%", alignSelf: s.who === "ai" ? "flex-start" : "flex-end", padding: "10px 14px", borderRadius: 16, fontSize: "0.95rem", lineHeight: 1.5, background: s.who === "ai" ? "#fff" : "var(--brand)", color: s.who === "ai" ? "var(--ink)" : "#fff", borderTopLeftRadius: s.who === "ai" ? 6 : 16, borderTopRightRadius: s.who === "ai" ? 16 : 6 }}>
                    {tr(s.en, s.hi)}
                  </div>
                ) : (
                  <div key={k} className="fade-in row" style={{ alignSelf: "center", gap: 6, fontSize: "0.78rem", padding: "4px 10px", borderRadius: 999, background: s.icon === "alert" ? "rgba(232,131,58,.18)" : "#2e3a49", color: s.icon === "alert" ? "#f6b07c" : "#c4ccd6" }}>
                    <Icon name={s.icon ?? (s.who === "end" ? "hangup" : "phone")} size={13} /> {tr(s.en, s.hi)}
                  </div>
                ),
              )}
            </div>
            <div className="row" style={{ padding: "12px 16px", borderTop: "1px solid #334050", flexWrap: "nowrap" }}>
              <button
                onClick={() => (i >= STEPS.length - 1 ? (setI(0), setPlaying(true)) : setPlaying(!playing))}
                aria-label={playing ? tr("Pause", "रोकें") : tr("Play", "चलाएँ")}
                style={{ width: 36, height: 36, borderRadius: 999, border: 0, background: "#fff", color: "var(--ink)", display: "grid", placeItems: "center", cursor: "pointer" }}
              >
                <Icon name={playing ? "pause" : i >= STEPS.length - 1 ? "undo" : "play"} size={15} fill={!playing && i < STEPS.length - 1} />
              </button>
              <div style={{ flex: 1, height: 4, borderRadius: 99, background: "#334050", overflow: "hidden" }}>
                <div style={{ width: `${(i / (STEPS.length - 1)) * 100}%`, height: "100%", background: "var(--gold)", transition: "width .4s" }} />
              </div>
              <span className="mono" style={{ color: "#aab4c0", fontSize: "0.78rem" }}>{String(i + 1).padStart(2, "0")}/{STEPS.length}</span>
            </div>
          </div>

          {/* owner side */}
          <div style={{ background: "var(--bg)", color: "var(--ink)", borderRadius: 20, padding: 20, display: "grid", gap: 14, alignContent: "start" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="small faint">{tr("Your dashboard", "आपका डैशबोर्ड")}</span>
              <span className="badge brand"><span className="dot" /> {tr("Live", "लाइव")}</span>
            </div>
            <div className="card pad" style={{ padding: 16 }}>
              <div className="row small" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                <strong style={{ fontWeight: 600 }}>{tr("Today", "आज")}</strong>
                <span className="faint">{tr("Calendar", "कैलेंडर")}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                {SLOTS.map((s) => {
                  const taken = s === "4:30" || (s === "5:30" && has("booked"));
                  return (
                    <div key={s} className="mono" style={{ textAlign: "center", padding: "8px 0", borderRadius: 8, fontSize: "0.8rem", border: "1px solid", borderColor: taken ? "var(--brand)" : "var(--line)", background: taken ? "var(--brand)" : "var(--surface)", color: taken ? "#fff" : "var(--ink-2)", transition: "all .3s" }}>
                      {s}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="row small" style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", justifyContent: "space-between" }}>
                <strong style={{ fontWeight: 600 }}>{tr("People to call back", "जिन्हें कॉल बैक करना है")}</strong>
              </div>
              {has("urgent") ? (
                <div className="row fade-in" style={{ padding: "12px 16px", gap: 10, flexWrap: "nowrap" }}>
                  <div className="grow">
                    <div style={{ fontWeight: 500 }}>Rahul {has("repeat") && <span className="badge brand" style={{ marginLeft: 4 }}>{tr("returning", "पुराने")}</span>}</div>
                    <div className="xs faint">{has("booked") ? tr("Booked 5:30 · wants root canal price", "5:30 बुक · रूट कैनाल का रेट चाहिए") : tr("Tooth pain, on the line now", "दाँत में दर्द, अभी लाइन पर")}</div>
                  </div>
                  <span className="badge fail">{tr("Urgent", "ज़रूरी")}</span>
                </div>
              ) : (
                <div className="small faint" style={{ padding: "12px 16px" }}>{tr("Nobody yet", "अभी कोई नहीं")}</div>
              )}
            </div>
            <div className="card" style={{ padding: 16, background: has("brief") ? "var(--brand-soft)" : "var(--surface)", borderColor: has("brief") ? "#c5e3e3" : "var(--line)", transition: "background-color .4s" }}>
              <div className="row small" style={{ gap: 6, marginBottom: 6 }}>
                <Icon name="sun" size={15} style={{ color: "var(--gold)" }} />
                <strong style={{ fontWeight: 600 }}>{tr("Evening brief", "शाम का ब्रीफ़")}</strong>
              </div>
              <p className="small" style={{ color: "var(--ink-2)" }}>
                {has("brief")
                  ? tr("Today you got 23 calls. 9 appointments are confirmed. 3 people need a callback. Most asked about root canal pricing.", "आज 23 कॉल आईं। 9 अपॉइंटमेंट पक्के हुए। 3 लोगों को कॉल बैक चाहिए। ज़्यादातर ने रूट कैनाल का रेट पूछा।")
                  : tr("Fills in when the day's calls are done.", "दिन की कॉल पूरी होने पर भरता है।")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
