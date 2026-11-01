"use client";
import { useState } from "react";
import { api } from "../fetcher";
import { Icon } from "../Icon";
import { useT } from "../lang";
import RunGrid, { Score, Transcript } from "./RunGrid";
import { useRun, type RunView } from "./useRun";
import { Empty, PageHead } from "./ui";
import type { TabProps } from "./types";

type Result = RunView["results"][number];
type Coached = { rule: string; version: number; runId: string; test: { title: string } };

export default function Fix({ data, reload, go }: TabProps) {
  const { t } = useT();
  const b = data.business;
  const latest = data.versions.find((v) => v.n === b.latestVersion);
  const lastRun = useRun(latest?.run?._id);
  const [pick, setPick] = useState<Result | null>(null);
  const [sentence, setSentence] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [coached, setCoached] = useState<Coached | null>(null);
  const newRun = useRun(coached?.runId, reload);

  const failures = [...new Map((lastRun?.results ?? []).filter((r) => !r.pass).map((r) => [r.scenarioId, r])).values()];
  const current = pick ?? failures[0] ?? null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!latest) return;
    setBusy(true);
    setErr("");
    try {
      const r = await api<Coached>(`/api/businesses/${b._id}/coach`, {
        method: "POST",
        json: { fromVersion: latest.n, sentence, runId: lastRun?._id, scenarioId: current?.scenarioId, rep: current?.rep },
      });
      setCoached(r);
      setSentence("");
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const head = <PageHead title={t("Fix in one sentence", "एक लाइन में सुधारिए")} sub={t("Say what it should have done, the way you'd tell a new receptionist. Pratihar makes it a rule, adds a test so the mistake can't come back, and practises again.", "बताइए क्या करना चाहिए था, जैसे नए रिसेप्शनिस्ट को बताते हैं। प्रतिहार इसे नियम बनाता है, टेस्ट जोड़ता है ताकि गलती लौटे नहीं, और फिर प्रैक्टिस करता है।")} />;

  if (!latest?.run)
    return (
      <>
        {head}
        <Empty icon="shield" title={t("Nothing to fix yet", "अभी कुछ सुधारना नहीं")} sub={t("Run the practice calls first. Anything it gets wrong shows up here.", "पहले प्रैक्टिस कॉल चलाइए। जो गलत होगा, यहाँ दिखेगा।")}>
          <button className="btn" onClick={() => go("practice")}>{t("Run test calls", "टेस्ट कॉल चलाइए")}</button>
        </Empty>
      </>
    );

  return (
    <>
      {head}
      <div className="fixgrid">
        <section className="col" style={{ gap: 12 }}>
          {lastRun?.status === "running" && <div className="card pad"><Score run={lastRun} /></div>}
          {lastRun?.status === "done" && failures.length === 0 && !coached && (
            <Empty icon="check" title={t("Every practice call passed", "हर प्रैक्टिस कॉल पास")} sub={t("You can still teach it something new below, or go live.", "फिर भी नीचे कुछ नया सिखा सकते हैं, या लाइव कर सकते हैं।")}>
              <button className="btn" onClick={() => go("golive")}>{t("Go live", "लाइव करें")} <Icon name="arrow" size={16} /></button>
            </Empty>
          )}
          {failures.map((r) => {
            const on = current?.scenarioId === r.scenarioId;
            const first = r.transcript.find((l) => l.who !== "Caller")?.text;
            return (
              <button key={r.scenarioId} onClick={() => setPick(r)} className="card" style={{ textAlign: "left", cursor: "pointer", padding: 16, borderColor: on ? "var(--brand)" : "var(--line)", boxShadow: on ? "0 0 0 3px var(--brand-soft)" : "var(--shadow-sm)" }}>
                <div className="row" style={{ gap: 8 }}>
                  <span className="badge fail"><Icon name="x" size={11} /> {t("Failed", "फ़ेल")}</span>
                  <strong style={{ fontWeight: 500 }}>{r.title}</strong>
                </div>
                {first && <p className="small muted" style={{ marginTop: 8 }}>“{first.length > 140 ? first.slice(0, 140) + "…" : first}”</p>}
              </button>
            );
          })}
          {current && (
            <details className="card pad">
              <summary className="small" style={{ cursor: "pointer", color: "var(--brand)" }}>{t("Read the whole call", "पूरी कॉल पढ़िए")}</summary>
              <div style={{ marginTop: 12 }}><Transcript r={current} /></div>
            </details>
          )}
        </section>

        <section className="col" style={{ gap: 16 }}>
          <form onSubmit={submit} className="card pad-lg col" style={{ gap: 12 }}>
            {current && (
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--fail-soft)", border: "1px solid #f1cfc9" }}>
                <div className="row xs" style={{ gap: 6, color: "var(--fail)" }}><Icon name="x" size={12} /> {current.title}</div>
                <p className="small" style={{ marginTop: 4 }}>{current.reason}</p>
              </div>
            )}
            <label className="field">
              <span className="row label" style={{ gap: 6 }}><Icon name="bulb" size={15} style={{ color: "var(--gold)" }} /> {t("Your fix", "आपका सुधार")}</span>
              <textarea className="textarea" rows={3} value={sentence} onChange={(e) => setSentence(e.target.value)} placeholder={t("If a price isn't on my list, don't guess. Offer a call back.", "रेट लिस्ट में नहीं है तो अंदाज़ा मत लगाओ। कॉल बैक ऑफ़र करो।")} />
            </label>
            <button className="btn" disabled={busy || sentence.trim().length < 5}>
              {busy ? <><span className="spin" /> {t("Teaching…", "सिखा रहे हैं…")}</> : t("Teach it and practise again", "सिखाइए और फिर प्रैक्टिस")}
            </button>
            {err && <p className="err">{err}</p>}
          </form>

          {coached && (
            <div className="card pad col fade-in" style={{ gap: 12 }}>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--pass-soft)", border: "1px solid #cfe3d6" }}>
                <div className="row xs" style={{ gap: 6, color: "var(--pass)" }}><Icon name="check" size={12} /> {t(`New rule, saved as version ${coached.version}`, `नया नियम, वर्ज़न ${coached.version} में सेव`)}</div>
                <p className="small" style={{ marginTop: 4 }}>“{coached.rule}”</p>
              </div>
              <p className="xs muted">{t("New test", "नया टेस्ट")}: {coached.test.title}</p>
              {newRun && <Score run={newRun} />}
              {newRun?.gate.ok && <button className="btn" onClick={() => go("golive")}>{t("Go live with this", "इसे लाइव करें")} <Icon name="arrow" size={16} /></button>}
              {newRun?.status === "done" && !newRun.gate.ok && <RunGrid run={newRun} />}
            </div>
          )}

          {data.tests.length > 0 && (
            <div className="card pad">
              <h3>{t("What you've taught it", "आपने क्या सिखाया")}</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gap: 12 }}>
                {data.tests.map((x) => (
                  <li key={x.id} className="row" style={{ gap: 10, alignItems: "flex-start", flexWrap: "nowrap" }}>
                    <Icon name="bulb" size={16} style={{ color: "var(--gold)", marginTop: 3 }} />
                    <div>
                      <div className="small">{x.sourceRule}</div>
                      <div className="xs faint">{t("Checked by", "जाँच")}: {x.title}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
      <style>{`.fixgrid{display:grid;gap:20px;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start}@media(max-width:900px){.fixgrid{grid-template-columns:1fr}}`}</style>
    </>
  );
}
