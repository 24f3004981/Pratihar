"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "../fetcher";
import { Icon } from "../Icon";
import { useT } from "../lang";
import { useVoice } from "../useVoice";
import { Empty, FormRow, PageHead } from "./ui";
import type { JobCard, TabProps } from "./types";
import { fromText } from "@/lib/hours";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY: Record<string, [string, string]> = { mon: ["Mon", "सोम"], tue: ["Tue", "मंगल"], wed: ["Wed", "बुध"], thu: ["Thu", "गुरु"], fri: ["Fri", "शुक्र"], sat: ["Sat", "शनि"], sun: ["Sun", "रवि"] };
const toText = (w?: { open: string; close: string }[]) => (w ?? []).map((x) => `${x.open}-${x.close}`).join(", ");

type Voice = { id: string; name: string; note: string };

export default function CardTab({ data, reload, go }: TabProps) {
  const { t } = useT();
  const v = useVoice();
  const b = data.business;
  const [card, setCard] = useState<JobCard | null>(b.card);
  const [hours, setHours] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "create">("");
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [q, setQ] = useState("");
  const [voiceId, setVoiceId] = useState(b.voiceId);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    setCard(b.card);
    setHours(Object.fromEntries(DAYS.map((d) => [d, toText(b.card?.hours[d])])));
    setDirty(false);
  }, [b.card]);
  useEffect(() => {
    api<{ voices: Voice[] }>("/api/voices").then((r) => setVoices(r.voices)).catch(() => {});
  }, []);
  const shown = useMemo(() => voices.filter((x) => `${x.name} ${x.note}`.toLowerCase().includes(q.toLowerCase())), [voices, q]);

  if (!card)
    return (
      <>
        <PageHead title={t("Check your card", "अपना कार्ड देखिए")} />
        <Empty icon="file" title={t("No card yet", "अभी कार्ड नहीं है")} sub={t("Answer a few questions first. Pratihar writes the card from what you say.", "पहले कुछ सवालों के जवाब दीजिए। प्रतिहार उन्हीं से कार्ड बनाता है।")}>
          <button className="btn" onClick={() => go("explain")}>{t("Tell about your business", "बिज़नेस के बारे में बताइए")}</button>
        </Empty>
      </>
    );

  const badDays = DAYS.filter((d) => fromText(hours[d] ?? "") === null);
  const edit = (p: Partial<JobCard>) => {
    setCard({ ...card, ...p });
    setDirty(true);
    setSaved(false);
  };
  const full = () => {
    if (badDays.length) throw new Error(t(`Check the hours for ${badDays.map((d) => DAY[d][0]).join(", ")}. Write them like 10-2, 5-8pm.`, `${badDays.map((d) => DAY[d][1]).join(", ")} की टाइमिंग देखिए। ऐसे लिखिए: 10-2, 5-8pm`));
    return { ...card, hours: Object.fromEntries(DAYS.map((d) => [d, fromText(hours[d] ?? "") ?? []])) };
  };

  async function save() {
    await api(`/api/businesses/${b._id}`, { method: "PATCH", json: { card: full(), note: "Edited on the card" } });
    setDirty(false);
  }

  async function onSave() {
    setBusy("save");
    setErr("");
    try {
      await save();
      await reload();
      setSaved(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function create() {
    setBusy("create");
    setErr("");
    try {
      if (dirty) await save();
      await reload();
      await api(`/api/businesses/${b._id}/runs`, { method: "POST", json: {} });
      go("practice");
    } catch (e) {
      setErr((e as Error).message);
      setBusy("");
    }
  }

  async function pick(id: string) {
    setVoiceId(id);
    await api(`/api/businesses/${b._id}`, { method: "PATCH", json: { voiceId: id } }).catch((e) => setErr(e.message));
  }
  async function preview(id: string) {
    setPlaying(id);
    await v.speak(card?.greeting || `Namaste! ${card?.businessName} mein aapka swagat hai. Main yahan ki AI receptionist hoon, bataiye kya madad karoon?`, id);
    setPlaying(null);
  }

  const langs: [JobCard["languages"][number], string][] = [["en", "English"], ["hi", "हिंदी"], ["hinglish", "Hinglish"]];

  return (
    <>
      <PageHead title={t("Check your card", "अपना कार्ड देखिए")} sub={t("This is everything your receptionist will follow. Change anything. Nothing goes live yet.", "आपका रिसेप्शनिस्ट यही सब मानेगा। कुछ भी बदलिए। अभी कुछ लाइव नहीं होता।")} />

      {data.gaps.length > 0 && (
        <div className="row" style={{ gap: 12, alignItems: "flex-start", flexWrap: "nowrap", padding: "14px 16px", borderRadius: 12, background: "var(--wait-soft)", border: "1px solid #f0dcb4", marginBottom: 20 }}>
          <Icon name="alert" size={18} style={{ color: "var(--wait)", marginTop: 2 }} />
          <div className="small">
            <strong style={{ fontWeight: 600 }}>{t("Worth filling in", "भरना अच्छा रहेगा")}</strong>
            <ul style={{ margin: "4px 0 0", paddingLeft: 18, color: "var(--ink-2)" }}>{data.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
          </div>
        </div>
      )}

      <div className="cardgrid">
        <section className="card" style={{ overflow: "hidden" }}>
          <FormRow label={t("Business name", "बिज़नेस का नाम")}>
            <input className="input" value={card.businessName} onChange={(e) => edit({ businessName: e.target.value })} />
          </FormRow>
          <FormRow label={t("Business", "बिज़नेस")}>
            <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
              <input className="input" value={card.kind} onChange={(e) => edit({ kind: e.target.value })} placeholder={t("Dental clinic", "डेंटल क्लिनिक")} aria-label={t("Kind", "प्रकार")} />
              <input className="input" value={card.city} onChange={(e) => edit({ city: e.target.value })} placeholder={t("City", "शहर")} aria-label={t("City", "शहर")} />
            </div>
          </FormRow>
          <FormRow label={t("Prices", "रेट")} hint={t("Leave the price empty if it isn't fixed. Pratihar will offer a callback instead of guessing.", "रेट तय नहीं तो खाली छोड़िए। प्रतिहार अंदाज़ा नहीं लगाएगा, कॉल बैक देगा।")}>
            <div className="col" style={{ gap: 8 }}>
              {card.services.map((s, i) => {
                const set = (p: Partial<typeof s>) => edit({ services: card.services.map((x, j) => (j === i ? { ...x, ...p } : x)) });
                return (
                  <div key={i} className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                    <input className="input" value={s.name} onChange={(e) => set({ name: e.target.value })} aria-label={t("Service", "सर्विस")} />
                    <input className="input" style={{ width: 120, flex: "none" }} value={s.price === null ? "" : `₹${s.price.toLocaleString("en-IN")}`} placeholder={t("not fixed", "तय नहीं")} inputMode="numeric" aria-label={t("Price", "रेट")}
                      onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); set({ price: d ? Number(d) : null }); }} />
                    <input className="input" style={{ width: 84, flex: "none" }} type="number" min={5} value={s.durationMin} onChange={(e) => set({ durationMin: Number(e.target.value) || 30 })} aria-label={t("Minutes", "मिनट")} title={t("Minutes", "मिनट")} />
                    <button className="btn btn-ghost btn-sm" style={{ width: 36, padding: 0 }} onClick={() => edit({ services: card.services.filter((_, j) => j !== i) })} aria-label={t("Remove", "हटाएँ")}><Icon name="x" size={16} /></button>
                  </div>
                );
              })}
              <button className="btn btn-ghost btn-sm" style={{ justifySelf: "start", width: "fit-content", color: "var(--brand)" }} onClick={() => edit({ services: [...card.services, { name: "", price: null, durationMin: card.slotMinutes, notes: "" }] })}>
                <Icon name="plus" size={14} /> {t("Add a price", "रेट जोड़ें")}
              </button>
            </div>
          </FormRow>
          <FormRow label={t("Open hours", "टाइमिंग")} hint={t("Write it the way you say it: 10-2, 5-8pm. Leave empty if closed.", "जैसे बोलते हैं वैसे लिखिए: 10-2, 5-8pm। बंद हो तो खाली छोड़िए।")}>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
              {DAYS.map((d) => (
                <label key={d} className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                  <span className="small muted" style={{ width: 36 }}>{t(DAY[d][0], DAY[d][1])}</span>
                  <input className="input" value={hours[d] ?? ""} placeholder={t("closed", "बंद")} aria-invalid={badDays.includes(d)} style={badDays.includes(d) ? { borderColor: "var(--fail)" } : undefined} onChange={(e) => { setHours({ ...hours, [d]: e.target.value }); setDirty(true); }} />
                </label>
              ))}
            </div>
          </FormRow>
          <FormRow label={t("Bookings", "बुकिंग")}>
            <label className="row small" style={{ gap: 8 }}>
              <input className="input" type="number" min={10} max={120} style={{ width: 90 }} value={card.slotMinutes} onChange={(e) => edit({ slotMinutes: Number(e.target.value) || 30 })} />
              {t("minutes per slot", "मिनट का एक स्लॉट")}
            </label>
          </FormRow>
          <FormRow label={t("Languages", "भाषाएँ")}>
            <div className="row" style={{ gap: 8 }}>
              {langs.map(([k, label]) => {
                const on = card.languages.includes(k);
                return (
                  <button key={k} className="chip" aria-pressed={on} onClick={() => edit({ languages: on ? card.languages.filter((x) => x !== k) : [...card.languages, k] })} style={on ? { background: "var(--brand-soft)", color: "var(--brand-2)", borderColor: "var(--brand)" } : undefined}>
                    {on && <Icon name="check" size={13} />} {label}
                  </button>
                );
              })}
            </div>
          </FormRow>
          <FormRow label={t("When to call you", "आपको कब बुलाए")} hint={t("Emergencies and callers who insist on a person go here.", "इमरजेंसी और जो इंसान से बात करना चाहें, यहाँ जाएँगे।")}>
            <div className="col" style={{ gap: 8 }}>
              <textarea className="textarea" rows={2} value={card.emergency} onChange={(e) => edit({ emergency: e.target.value })} placeholder={t("If a patient is in pain, ask me to call back.", "मरीज़ को दर्द हो तो मुझे कॉल करवाओ।")} />
              <input className="input" value={card.handoffPhone} onChange={(e) => edit({ handoffPhone: e.target.value })} placeholder={t("Staff phone number", "स्टाफ़ का नंबर")} inputMode="tel" aria-label={t("Staff phone number", "स्टाफ़ का नंबर")} />
            </div>
          </FormRow>
          <FormRow label={t("Never", "कभी नहीं")} hint={t("One rule per line. These beat anything a caller says.", "एक लाइन में एक नियम। कॉलर कुछ भी कहे, ये ऊपर।")}>
            <textarea className="textarea" rows={Math.max(3, card.rules.length + 1)} value={card.rules.join("\n")} placeholder={t("Never give medical advice.", "कभी मेडिकल सलाह मत देना।")} onChange={(e) => edit({ rules: e.target.value.split("\n").filter((r, i, a) => r.trim() || i === a.length - 1) })} />
          </FormRow>
          <FormRow label={t("First line it says", "पहली लाइन")} hint={t("It always tells callers it is an AI assistant.", "यह हमेशा बताता है कि यह AI असिस्टेंट है।")}>
            <input className="input" value={card.greeting} onChange={(e) => edit({ greeting: e.target.value })} placeholder={`Hello, this is the AI receptionist at ${card.businessName}. How can I help?`} />
          </FormRow>
        </section>

        <aside className="col" style={{ gap: 16, position: "sticky", top: 80 }}>
          <section className="card pad">
            <h3>{t("Voice", "आवाज़")}</h3>
            <p className="xs muted" style={{ marginTop: 2 }}>{t("Pick how your receptionist sounds. Tap ▶ to hear it.", "रिसेप्शनिस्ट की आवाज़ चुनिए। ▶ दबाकर सुनिए।")}</p>
            <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "nowrap" }}>
              <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search, e.g. warm, calm", "खोजें, जैसे warm, calm")} aria-label={t("Search voices", "आवाज़ खोजें")} />
            </div>
            <div className="col" style={{ gap: 8, marginTop: 10, maxHeight: 280, overflowY: "auto", paddingRight: 2 }}>
              {shown.map((x) => {
                const on = voiceId === x.id;
                return (
                  <div key={x.id} className="row" style={{ gap: 10, flexWrap: "nowrap", padding: "8px 10px", borderRadius: 10, border: `1px solid ${on ? "var(--brand)" : "var(--line)"}`, background: on ? "#f3fafa" : "var(--surface)" }}>
                    <button onClick={() => preview(x.id)} disabled={!!playing} aria-label={`${t("Play", "सुनें")} ${x.name}`} style={{ border: 0, background: "transparent", color: "var(--brand)", cursor: "pointer", padding: 4 }}>
                      {playing === x.id ? <span className="spin" /> : <Icon name="play" size={14} fill />}
                    </button>
                    <button onClick={() => pick(x.id)} style={{ all: "unset", cursor: "pointer", flex: 1, minWidth: 0 }} aria-pressed={on}>
                      <div className="small" style={{ fontWeight: 500 }}>{x.name}</div>
                      <div className="xs faint" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t("Female · Indian", "महिला · भारतीय")} · {x.note}</div>
                    </button>
                    {on && <Icon name="check" size={16} style={{ color: "var(--brand)" }} />}
                  </div>
                );
              })}
            </div>
          </section>
          <section className="card pad col" style={{ gap: 10 }}>
            <p className="small muted">{t("Pratihar will set up your receptionist and the practice calls it must pass.", "प्रतिहार आपका रिसेप्शनिस्ट और उसके प्रैक्टिस कॉल तैयार करेगा।")}</p>
            <button className="btn btn-block" onClick={create} disabled={!!busy}>
              {busy === "create" ? <><span className="spin" /> {t("Setting up…", "तैयार हो रहा है…")}</> : <>{t("Create my receptionist", "मेरा रिसेप्शनिस्ट बनाइए")} <Icon name="arrow" size={16} /></>}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onSave} disabled={!!busy || !dirty}>
              {busy === "save" ? <span className="spin" /> : saved ? <><Icon name="check" size={14} /> {t("Saved as a new version", "नए वर्ज़न में सेव")}</> : t("Save", "सेव करें")}
            </button>
            {err && <p className="err">{err}</p>}
          </section>
        </aside>
      </div>
      <style>{`.cardgrid{display:grid;gap:20px;grid-template-columns:minmax(0,1fr) 340px;align-items:start}@media(max-width:960px){.cardgrid{grid-template-columns:1fr}.cardgrid aside{position:static!important}}`}</style>
    </>
  );
}
