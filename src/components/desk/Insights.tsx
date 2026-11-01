"use client";
import { useEffect, useState } from "react";
import { api } from "../fetcher";
import { useT } from "../lang";
import { Icon } from "../Icon";
import { PageHead, Stat } from "./ui";
import type { TabProps } from "./types";
import type { Analytics } from "@/lib/tiger";

type Data = Analytics & { brief: string; openCallbacks: number; topic: string | null };

const WD: [string, string][] = [["Mon", "सोम"], ["Tue", "मंगल"], ["Wed", "बुध"], ["Thu", "गुरु"], ["Fri", "शुक्र"], ["Sat", "शनि"], ["Sun", "रवि"]];

/** Paired bars: total calls behind, bookings in front. Labels every few bars so it stays readable on a phone. */
function Bars({ rows, label, every = 1, height = 140 }: { rows: { calls: number; booked?: number; key: string }[]; label: (i: number) => string; every?: number; height?: number }) {
  const max = Math.max(1, ...rows.map((r) => r.calls));
  const w = 100 / rows.length;
  return (
    <svg viewBox={`0 0 100 ${height / 4 + 8}`} preserveAspectRatio="none" style={{ width: "100%", height: height + 30 }} role="img">
      {rows.map((r, i) => {
        const h = (r.calls / max) * (height / 4);
        const hb = ((r.booked ?? 0) / max) * (height / 4);
        return (
          <g key={r.key}>
            <title>{`${label(i)}: ${r.calls} calls${r.booked !== undefined ? `, ${r.booked} booked` : ""}`}</title>
            <rect x={i * w + w * 0.15} width={w * 0.7} y={height / 4 - h} height={h} fill="#cfe8e8" stroke="none" strokeWidth={0.15} rx={0.4} />
            {r.booked !== undefined && hb > 0 && <rect x={i * w + w * 0.3} width={w * 0.4} y={height / 4 - hb} height={hb} fill="var(--brand)" rx={0.3} />}
            {i % every === 0 && (
              <text x={i * w + w / 2} y={height / 4 + 6} fontSize={2.6} textAnchor="middle" fill="var(--ink-3)">
                {label(i)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function Insights({ data }: TabProps) {
  const { t, lang } = useT();
  const [d, setD] = useState<Data | null>(null);
  const [days, setDays] = useState(14);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<Data>(`/api/businesses/${data.business._id}/insights?days=${days}&lang=${lang}`).then(setD).catch((e) => setErr(e.message));
  }, [data.business._id, days, lang]);

  if (err) return <p className="err">{err}</p>;
  if (!d) return <span className="spin" />;

  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  const peakHour = d.byHour.reduce((a, b) => (b.calls > a.calls ? b : a), d.byHour[0]);
  const kpis: [string, string, string | number, string?][] = [
    ["Calls", "कॉल", d.totals.calls],
    ["Handled", "संभाली", d.totals.handled, pct(d.totals.handled, d.totals.calls)],
    ["Booked", "बुक", d.totals.booked, pct(d.totals.booked, d.totals.calls)],
    ["Want a callback", "कॉल बैक", d.totals.callbacks, `${d.openCallbacks} ${t("open", "बाकी")}`],
    ["Didn't convert", "बुक नहीं हुई", d.totals.unconverted],
    ["Avg call", "औसत कॉल", `${d.totals.avgSec}s`],
  ];

  return (
    <>
    <PageHead title={t("Insights", "रिपोर्ट")} sub={t("What your calls say about the business: when people call, what they want, and which version of Pratihar books best.", "आपकी कॉल बिज़नेस के बारे में क्या बताती हैं: लोग कब कॉल करते हैं, क्या चाहते हैं, और कौन सा वर्ज़न ज़्यादा बुक करता है।")} />
    <div className="col" style={{ gap: 20 }}>
      <section className="card pad-lg" style={{ background: "var(--brand-soft)", borderColor: "#c5e3e3" }}>
        <div className="row" style={{ lineHeight: 1.4 }}>
          <span className="row small" style={{ gap: 6, fontWeight: 600 }}><Icon name="sun" size={16} style={{ color: "var(--gold)" }} /> {t("Pratihar's daily brief", "प्रतिहार का रोज़ का ब्रीफ़")}</span>
          <span className="grow" />
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            {d.source === "tigerdata" ? t("from TigerData", "TigerData से") : t("from MongoDB (TigerData not connected)", "MongoDB से (TigerData जुड़ा नहीं)")}
          </span>
        </div>
        <p style={{ fontSize: "1.3rem", lineHeight: 1.45, marginTop: 10 }}>{d.brief}</p>
      </section>

      <div className="row">
        {[7, 14, 30].map((n) => (
          <button key={n} className={`chip ${days === n ? "on" : ""}`} onClick={() => setDays(n)}>
            {t(`${n} days`, `${n} दिन`)}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {kpis.map(([en, hi, v, sub]) => <Stat key={en} label={t(en, hi)} value={v} sub={sub} />)}
      </div>

      {d.totals.calls === 0 ? (
        <p className="muted">{t("Charts fill in as real calls come in.", "असली कॉल आने पर चार्ट भरेंगे।")}</p>
      ) : (
        <>
          <section className="card pad">
            <div className="row">
              <h3 style={{ margin: 0 }}>{t("Calls and bookings by day", "दिन के हिसाब से कॉल और बुकिंग")}</h3>
              <span className="grow" />
              <span className="muted" style={{ fontSize: "0.8rem" }}>
                <span style={{ display: "inline-block", width: 10, height: 10, background: "#cfe8e8", border: "1px solid var(--brand)", marginRight: 4 }} />{t("calls", "कॉल")}
                <span style={{ display: "inline-block", width: 10, height: 10, background: "var(--brand)", margin: "0 4px 0 12px" }} />{t("booked", "बुक")}
              </span>
            </div>
            <Bars rows={d.byDay.map((x) => ({ ...x, key: x.day }))} label={(i) => d.byDay[i].day.slice(8)} every={days > 14 ? 3 : 1} />
          </section>

          <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
            <section className="card pad">
              <h3>{t("Busiest hours", "सबसे व्यस्त घंटे")}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {t(`Most calls come in around ${peakHour.hour}:00.`, `सबसे ज़्यादा कॉल ${peakHour.hour}:00 के आसपास आती हैं।`)}
              </p>
              <Bars rows={d.byHour.map((x) => ({ calls: x.calls, key: String(x.hour) }))} label={(i) => String(i)} every={3} height={110} />
            </section>
            <section className="card pad">
              <h3>{t("By weekday", "हफ़्ते के दिन")}</h3>
              <Bars rows={d.byWeekday.map((x) => ({ ...x, key: String(x.dow) }))} label={(i) => WD[i][lang === "hi" ? 1 : 0]} height={110} />
            </section>
          </div>

          <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
            <section className="card pad">
              <h3>{t("Which version books best", "कौन सा वर्ज़न बेहतर बुक करता है")}</h3>
              <table className="table">
                <thead><tr><th>v</th><th>{t("Calls", "कॉल")}</th><th>{t("Booked", "बुक")}</th><th>{t("Went wrong", "गड़बड़")}</th></tr></thead>
                <tbody>
                  {d.versions.map((v) => (
                    <tr key={v.version}>
                      <td><strong>{v.version || "?"}</strong></td>
                      <td>{v.calls}</td>
                      <td>{v.booked} <span className="muted">({pct(v.booked, v.calls)})</span></td>
                      <td>{v.failed} <span className="muted">({pct(v.failed, v.calls)})</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="card pad">
              <h3>{t("What people call about", "लोग किस बारे में कॉल करते हैं")}</h3>
              <table className="table">
                <thead><tr><th>{t("Reason", "वजह")}</th><th>{t("Calls", "कॉल")}</th><th>{t("Turned into a booking", "बुकिंग बनी")}</th></tr></thead>
                <tbody>
                  {d.intents.map((x) => (
                    <tr key={x.intent}>
                      <td>{x.intent}</td>
                      <td>{x.calls}</td>
                      <td>{pct(x.booked, x.calls)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </div>
    </>
  );
}
