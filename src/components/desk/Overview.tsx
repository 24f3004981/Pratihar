"use client";
import { useEffect, useState } from "react";
import { api } from "../fetcher";
import { Icon, type IconName } from "../Icon";
import { useT } from "../lang";
import { CallLink } from "./CallLink";
import type { DeskData, TabProps } from "./types";

type Step = { id: string; icon: IconName; en: string; hi: string; den: string; dhi: string; cta: [string, string] };

export const STEPS: Step[] = [
  { id: "explain", icon: "mic", en: "Tell about your business", hi: "बिज़नेस के बारे में बताइए", den: "Answer a few questions by speaking or typing.", dhi: "बोलकर या लिखकर कुछ सवालों के जवाब दीजिए।", cta: ["Start", "शुरू करें"] },
  { id: "card", icon: "file", en: "Check prices & timings", hi: "रेट और टाइमिंग देखिए", den: "Make sure everything is correct.", dhi: "देख लीजिए सब सही है।", cta: ["Check now", "अभी देखिए"] },
  { id: "practice", icon: "shield", en: "Test calls", hi: "टेस्ट कॉल", den: "Pratihar practises 24 tricky calls.", dhi: "प्रतिहार 24 मुश्किल कॉल पर अभ्यास करता है।", cta: ["Run test calls", "टेस्ट कॉल चलाइए"] },
  { id: "fix", icon: "bulb", en: "Correct mistakes", hi: "गलती सुधारिए", den: "Tell it in one line what to do.", dhi: "एक लाइन में बताइए क्या करना है।", cta: ["Correct", "सुधारिए"] },
  { id: "golive", icon: "flag", en: "Start taking calls", hi: "कॉल लेना शुरू करें", den: "Get your call link and share it.", dhi: "अपना कॉल लिंक लेकर शेयर कीजिए।", cta: ["Go live", "लाइव करें"] },
];

export function progress(data: DeskData) {
  const b = data.business;
  const latest = data.versions.find((v) => v.n === b.latestVersion);
  const run = latest?.run;
  const passed = !!run && run.status === "done" && run.total > 0 && run.passed / run.total >= 0.9;
  const done: Record<string, boolean> = {
    explain: b.interview.some((t) => t.role === "owner") && !!b.card,
    card: !!b.latestVersion,
    practice: !!run && run.status === "done",
    fix: passed,
    golive: !!b.liveVersion,
  };
  const next = STEPS.find((s) => !done[s.id]) ?? null;
  return { done, next, count: STEPS.filter((s) => done[s.id]).length };
}

type Tile = { id: string; icon: IconName; en: string; hi: string; tone?: "gold" };
// The things an owner comes back for, in the order they'll want them.
export const TILES: Tile[] = [
  { id: "calls", icon: "inbox", en: "Calls & callbacks", hi: "कॉल और कॉल बैक" },
  { id: "calendar", icon: "calendar", en: "Appointments", hi: "अपॉइंटमेंट" },
  { id: "card", icon: "file", en: "Prices & timings", hi: "रेट और टाइमिंग" },
  { id: "fix", icon: "bulb", en: "Teach Pratihar", hi: "प्रतिहार को सिखाइए", tone: "gold" },
  { id: "practice", icon: "phone", en: "Test call", hi: "टेस्ट कॉल" },
  { id: "knowledge", icon: "upload", en: "Upload price list", hi: "रेट लिस्ट डालिए" },
  { id: "insights", icon: "chart", en: "Reports", hi: "रिपोर्ट" },
  { id: "golive", icon: "flag", en: "Call link & sharing", hi: "कॉल लिंक और शेयर" },
  { id: "security", icon: "lock", en: "Safety log", hi: "सुरक्षा लॉग" },
];

type Insights = { today: { calls: number; booked: number; callbacks: number }; openCallbacks: number; brief: string };

export default function Overview({ data, go, me }: TabProps & { me?: { name: string } | null }) {
  const { t, lang } = useT();
  const b = data.business;
  const { done, next, count } = progress(data);
  const [ins, setIns] = useState<Insights | null>(null);
  const first = me?.name.split(/\s+/)[0];
  const other = (en: string, hi: string) => (lang === "hi" ? en : hi);

  useEffect(() => {
    if (b.liveVersion) api<Insights>(`/api/businesses/${b._id}/insights?days=7&lang=${lang}`).then(setIns).catch(() => {});
  }, [b._id, b.liveVersion, lang]);

  return (
    <div className="col" style={{ gap: 22 }}>
      <div>
        <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2.3rem)" }}>{t("Namaste", "नमस्ते")}{first ? `, ${first} ji` : ""}</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          {next ? t("Finish the steps below and Pratihar starts picking up your calls.", "नीचे के कदम पूरे कीजिए, फिर प्रतिहार आपकी कॉल उठाने लगेगा।") : t("Tap any box below to open it.", "खोलने के लिए नीचे किसी भी बॉक्स पर टैप कीजिए।")}
        </p>
      </div>

      {next ? (
        <section className="card" style={{ padding: 22, borderColor: "var(--brand)", boxShadow: "0 0 0 4px var(--brand-soft)" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <strong style={{ fontSize: "1.1rem", fontWeight: 600 }}>{t("Set up your receptionist", "अपना रिसेप्शनिस्ट तैयार कीजिए")}</strong>
            <span className="badge brand">{t(`${count} of 5 done`, `5 में से ${count} पूरे`)}</span>
          </div>
          <ol className="steps-dots" aria-label={t("Setup steps", "सेटअप के कदम")}>
            {STEPS.map((s, i) => (
              <li key={s.id} data-done={done[s.id]} data-next={next.id === s.id}>
                <button onClick={() => go(s.id)} aria-label={`${i + 1}. ${t(s.en, s.hi)}`}>
                  {done[s.id] ? <Icon name="check" size={16} /> : i + 1}
                </button>
                <span>{t(s.en, s.hi)}</span>
              </li>
            ))}
          </ol>
          <div className="row" style={{ marginTop: 18, gap: 14, flexWrap: "nowrap", alignItems: "center", padding: 14, borderRadius: 14, background: "var(--brand-soft)" }}>
            <span className="tile" style={{ width: 48, height: 48, borderRadius: 14, background: "var(--brand)", color: "#fff" }}><Icon name={next.icon} size={22} /></span>
            <div className="grow">
              <div className="xs" style={{ color: "var(--brand)", fontWeight: 600 }}>{t(`Step ${STEPS.indexOf(next) + 1}`, `कदम ${STEPS.indexOf(next) + 1}`)}</div>
              <div style={{ fontWeight: 600 }}>{t(next.en, next.hi)}</div>
              <div className="xs muted">{t(next.den, next.dhi)}</div>
            </div>
          </div>
          <button className="btn btn-block" style={{ marginTop: 14, height: 54, fontSize: "1.05rem" }} onClick={() => go(next.id)}>
            {t(next.cta[0], next.cta[1])} <Icon name="arrow" size={18} />
          </button>
        </section>
      ) : (
        <section className="card" style={{ padding: 20 }}>
          <div className="row" style={{ gap: 8 }}>
            <span className="dot live" />
            <strong style={{ fontWeight: 600 }}>{t("Pratihar is answering your calls", "प्रतिहार आपकी कॉल उठा रहा है")}</strong>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14 }}>
            {[
              [t("Calls today", "आज की कॉल"), ins?.today.calls],
              [t("Booked today", "आज बुक"), ins?.today.booked],
              [t("Call back", "कॉल बैक"), ins?.openCallbacks],
            ].map(([label, v]) => (
              <div key={String(label)} style={{ padding: "12px 10px", borderRadius: 12, background: "var(--bg)", textAlign: "center" }}>
                <div style={{ fontSize: "1.8rem", lineHeight: 1.1 }}>{v ?? "–"}</div>
                <div className="xs muted">{label}</div>
              </div>
            ))}
          </div>
          {ins?.brief && <p style={{ marginTop: 14, fontSize: "1.02rem", lineHeight: 1.55 }}>{ins.brief}</p>}
        </section>
      )}

      {b.latestVersion > 0 && <CallLink id={b._id} live={!!b.liveVersion} />}

      <section>
        <h2 className="sr">{t("Everything", "सब कुछ")}</h2>
        <div className="tiles">
          {TILES.map((tile) => {
            const badge = tile.id === "calls" && ins?.openCallbacks ? ins.openCallbacks : null;
            return (
              <button key={tile.id} className="tile-btn" onClick={() => go(tile.id)}>
                <span className={`tile ${tile.tone ?? ""}`} style={{ width: 52, height: 52, borderRadius: 16 }}><Icon name={tile.icon} size={24} /></span>
                <span className="tile-label">{t(tile.en, tile.hi)}</span>
                <span className="tile-sub">{other(tile.en, tile.hi)}</span>
                {badge ? <span className="tile-badge">{badge}</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      <style>{`
        .steps-dots{list-style:none;padding:0;margin:18px 0 0;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;position:relative}
        .steps-dots::before{content:"";position:absolute;top:18px;left:10%;right:10%;height:2px;background:var(--line)}
        .steps-dots li{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;position:relative}
        .steps-dots button{width:38px;height:38px;border-radius:99px;border:2px solid var(--line-2);background:var(--surface);color:var(--ink-3);font-weight:600;cursor:pointer;display:grid;place-items:center}
        .steps-dots li[data-done=true] button{background:var(--brand);border-color:var(--brand);color:#fff}
        .steps-dots li[data-next=true] button{border-color:var(--brand);color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft)}
        .steps-dots span{font-size:.72rem;line-height:1.25;color:var(--ink-2)}
        .tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
        .tile-btn{all:unset;box-sizing:border-box;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:148px;padding:18px 10px;text-align:center;background:var(--surface);border:1px solid var(--line);border-radius:18px;cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .1s}
        .tile-btn:hover{border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft)}
        .tile-btn:hover .tile{background:var(--brand);color:#fff}
        .tile-btn:hover .tile-label{color:var(--brand-2)}
        .tile-btn:active{transform:scale(.98)}
        .tile-btn:focus-visible{outline:3px solid var(--brand);outline-offset:2px}
        .tile-label{font-weight:600;font-size:1rem;line-height:1.3;color:var(--ink)}
        .tile-sub{font-size:.8rem;color:var(--ink-3);line-height:1.2}
        .tile-badge{position:absolute;top:12px;right:12px;min-width:24px;height:24px;padding:0 7px;border-radius:99px;background:var(--fail);color:#fff;font-size:.8rem;font-weight:600;display:grid;place-items:center}
        @media(max-width:520px){.tiles{grid-template-columns:repeat(2,1fr)}.steps-dots span{font-size:.66rem}}
      `}</style>
    </div>
  );
}
