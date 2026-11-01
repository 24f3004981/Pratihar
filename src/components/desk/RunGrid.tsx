"use client";
import { useState } from "react";
import { Icon } from "../Icon";
import { useT } from "../lang";
import type { RunView } from "./useRun";

type Result = RunView["results"][number];

export function Transcript({ r }: { r: Result }) {
  return (
    <div className="col" style={{ gap: 8 }}>
      {r.transcript.map((l, i) => (
        <div key={i} className={`msg ${l.who === "Caller" ? "me" : "them"}`} style={{ fontSize: "0.9rem" }}>{l.text}</div>
      ))}
      {r.tools.length > 0 && (
        <div className="row" style={{ gap: 6 }}>
          {r.tools.map((x, i) => (
            <span key={i} className={`badge ${x.allowed ? "" : "fail"}`} title={x.allowed ? JSON.stringify(x.args) : x.reason}>
              <Icon name={x.allowed ? "check" : "lock"} size={11} /> {x.name.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
      <div className="row small" style={{ gap: 8, alignItems: "flex-start", flexWrap: "nowrap", padding: "10px 12px", borderRadius: 10, background: r.pass ? "var(--pass-soft)" : "var(--fail-soft)", color: r.pass ? "var(--pass)" : "var(--fail)" }}>
        <Icon name={r.pass ? "check" : "x"} size={15} style={{ marginTop: 3 }} />
        <span style={{ color: "var(--ink)" }}>{r.reason}</span>
      </div>
    </div>
  );
}

export function Score({ run }: { run: RunView }) {
  const { t } = useT();
  const pct = run.total ? run.passed / run.total : 0;
  const R = 26;
  const C = 2 * Math.PI * R;
  return (
    <div className="row" style={{ gap: 14, flexWrap: "nowrap" }}>
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r={R} fill="none" stroke="var(--sunk)" strokeWidth="6" />
        <circle cx="32" cy="32" r={R} fill="none" stroke={run.status === "done" && !run.gate.ok ? "var(--gold)" : "var(--brand)"} strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - (run.status === "running" ? run.done / run.total : pct))} transform="rotate(-90 32 32)" style={{ transition: "stroke-dashoffset .5s" }} />
      </svg>
      <div>
        <div style={{ fontSize: "1.6rem", lineHeight: 1.1 }}>{run.passed}<span className="faint" style={{ fontSize: "1rem" }}> / {run.total}</span></div>
        <div className="xs muted">
          {run.status === "running" ? t(`${run.done} of ${run.total} calls played…`, `${run.total} में से ${run.done} कॉल हुईं…`) : run.status === "error" ? run.error : run.gate.why}
        </div>
      </div>
    </div>
  );
}

export default function RunGrid({ run, onCoach }: { run: RunView; onCoach?: (r: Result) => void }) {
  const { t } = useT();
  const [open, setOpen] = useState<string | null>(null);
  const groups = new Map<string, Result[]>();
  for (const r of run.results) groups.set(r.scenarioId, [...(groups.get(r.scenarioId) ?? []), r]);
  const pending = run.status === "running" ? Math.max(0, Math.ceil(run.total / 3) - groups.size) : 0;

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {[...groups.entries()].map(([sid, rs]) => {
        const sorted = [...rs].sort((a, b) => a.rep - b.rep);
        const allPass = sorted.every((r) => r.pass);
        const isOpen = open?.startsWith(sid + ":");
        const shown = sorted.find((r) => `${sid}:${r.rep}` === open);
        return (
          <div key={sid} style={{ borderBottom: "1px solid var(--line)" }}>
            <div className="row" style={{ padding: "14px 18px", flexWrap: "nowrap", gap: 14 }}>
              <span style={{ width: 28, height: 28, borderRadius: 99, flex: "none", display: "grid", placeItems: "center", background: allPass ? "var(--pass-soft)" : "var(--fail-soft)", color: allPass ? "var(--pass)" : "var(--fail)" }}>
                <Icon name={allPass ? "check" : "x"} size={14} />
              </span>
              <div className="grow">
                <div style={{ fontWeight: 500 }}>{sorted[0].title}</div>
                {sorted[0].regression && <span className="badge brand" style={{ marginTop: 4 }}><Icon name="bulb" size={11} /> {t("your fix", "आपका सुधार")}</span>}
              </div>
              <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                {sorted.map((r) => {
                  const k = `${sid}:${r.rep}`;
                  return (
                    <button
                      key={r.rep}
                      onClick={() => setOpen(open === k ? null : k)}
                      aria-expanded={open === k}
                      aria-label={`${t("Try", "प्रयास")} ${r.rep}: ${r.pass ? t("passed", "पास") : t("failed", "फ़ेल")}`}
                      className="mono"
                      style={{ height: 30, minWidth: 54, padding: "0 8px", borderRadius: 8, cursor: "pointer", fontSize: "0.75rem", border: `1px solid ${open === k ? "var(--ink)" : r.pass ? "#cfe3d6" : "#f1cfc9"}`, background: r.pass ? "var(--pass-soft)" : "var(--fail-soft)", color: r.pass ? "var(--pass)" : "var(--fail)" }}
                    >
                      {t("try", "प्रयास")} {r.rep}
                    </button>
                  );
                })}
              </div>
            </div>
            {isOpen && shown && (
              <div className="fade-in" style={{ padding: "4px 18px 18px 60px", background: "var(--bg)" }}>
                <div style={{ paddingTop: 14 }}><Transcript r={shown} /></div>
                {!shown.pass && onCoach && (
                  <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => onCoach(shown)}>
                    <Icon name="bulb" size={14} /> {t("Fix this in one sentence", "इसे एक लाइन में सुधारिए")}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {Array.from({ length: pending }, (_, i) => (
        <div key={i} className="row" style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", gap: 14, flexWrap: "nowrap" }}>
          <span className="spin" style={{ color: "var(--ink-3)", margin: 6 }} />
          <div className="skeleton" style={{ height: 14, width: `${40 + ((i * 17) % 40)}%` }} />
        </div>
      ))}
    </div>
  );
}
