"use client";
import { Fragment, useCallback, useEffect, useState } from "react";
import { api } from "../fetcher";
import { Icon } from "../Icon";
import { useT } from "../lang";
import { PageHead, Panel, Stat } from "./ui";
import type { TabProps } from "./types";
import type { CallDoc } from "@/lib/calls";

type Call = CallDoc & { startedAt: string };
type Callback = { _id: string; name: string; phone: string; reason: string; urgent: boolean; at: string };
type Appt = { bookingId: string; start: string; name: string; service: string; status: string; phone: string };

const RESULT: Record<string, [string, string, string]> = {
  booked: ["Booked", "बुक", "pass"],
  callback: ["Wants a call", "कॉल बैक", "wait"],
  handoff: ["Sent to you", "आपको भेजा", "brand"],
  answered: ["Answered", "जवाब दिया", ""],
  dropped: ["Hung up", "कट गई", "fail"],
  failed: ["Went wrong", "गड़बड़", "fail"],
};

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function Calls({ data }: TabProps) {
  const { t, lang } = useT();
  const id = data.business._id;
  const [calls, setCalls] = useState<Call[] | null>(null);
  const [callbacks, setCallbacks] = useState<Callback[]>([]);
  const [upcoming, setUpcoming] = useState<Appt[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setChecking(true);
    try {
      const [c, cal] = await Promise.all([
        api<{ calls: Call[]; callbacks: Callback[] }>(`/api/businesses/${id}/calls`),
        api<{ appointments: Appt[] }>(`/api/businesses/${id}/calendar?days=7`).catch(() => ({ appointments: [] })),
      ]);
      setCalls(c.calls);
      setCallbacks(c.callbacks);
      setUpcoming(cal.appointments.filter((a) => a.status === "booked" && new Date(a.start) > new Date()).slice(0, 6));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setChecking(false);
    }
  }, [id]);
  useEffect(() => {
    void load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [load]);

  const list = calls ?? [];
  const n = list.length;
  const booked = list.filter((c) => c.outcome === "booked").length;
  const needYou = list.filter((c) => c.lead && c.lead.nextAction !== "none").length + callbacks.filter((cb) => !list.some((c) => c.lead?.phone === cb.phone)).length;
  const avg = n ? Math.round(list.reduce((a, c) => a + (c.durationS ?? 0), 0) / n) : 0;
  const handled = list.filter((c) => c.outcome !== "dropped" && c.outcome !== "failed").length;
  const happy = list.filter((c) => (c.summary?.sentiment ?? 0) > 0.2).length;
  const pct = (a: number) => (n ? `${Math.round((a / n) * 100)}%` : "–");

  const leads = list.filter((c) => c.lead && c.lead.nextAction !== "none").sort((a, b) => (b.lead!.urgency === "high" ? 1 : 0) - (a.lead!.urgency === "high" ? 1 : 0));

  return (
    <>
      <PageHead title={t("Calls", "कॉल")} sub={t("Every conversation and what happened. A booking counts only if it's in your calendar.", "हर बातचीत और उसमें क्या हुआ। बुकिंग तभी मानी जाती है जब कैलेंडर में हो।")}>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={checking}>{checking ? <span className="spin" /> : <Icon name="undo" size={14} />} {t("Check for new calls", "नई कॉल देखें")}</button>
      </PageHead>
      {err && <p className="err">{err}</p>}

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", marginBottom: 20 }}>
        <Stat label={t("Calls", "कॉल")} value={calls ? n : "–"} />
        <Stat label={t("Bookings", "बुकिंग")} value={calls ? booked : "–"} sub={pct(booked)} />
        <Stat label={t("Need you", "आपकी ज़रूरत")} value={calls ? needYou : "–"} tone={needYou ? "wait" : undefined} />
        <Stat label={t("Avg length", "औसत लंबाई")} value={calls ? `${Math.floor(avg / 60)}:${String(avg % 60).padStart(2, "0")}` : "–"} />
        <Stat label={t("Handled", "संभाली")} value={calls ? pct(handled) : "–"} />
        <Stat label={t("Happy callers", "खुश कॉलर")} value={calls ? pct(happy) : "–"} />
      </div>

      <section className="card" style={{ overflow: "hidden", marginBottom: 20 }}>
        <div className="scroll-x">
          <table className="table">
            <thead><tr><th style={{ width: 130 }}>{t("Time", "समय")}</th><th>{t("What happened", "क्या हुआ")}</th><th>{t("Booking", "बुकिंग")}</th><th>{t("Result", "नतीजा")}</th></tr></thead>
            <tbody>
              {calls === null && <tr><td colSpan={4} className="faint">{t("Loading…", "लोड हो रहा है…")}</td></tr>}
              {calls?.length === 0 && <tr><td colSpan={4} className="faint">{t("No calls yet. Once you're live, they show up here within seconds of hanging up.", "अभी कोई कॉल नहीं। लाइव होने पर फ़ोन रखते ही यहाँ दिखेंगी।")}</td></tr>}
              {list.map((c) => {
                const r = RESULT[c.outcome ?? "answered"] ?? RESULT.answered;
                return (
                  <Fragment key={c._id}>
                    <tr onClick={() => setOpen(open === c._id ? null : c._id)} style={{ cursor: "pointer" }} aria-expanded={open === c._id}>
                      <td className="small muted" style={{ whiteSpace: "nowrap" }}>{when(c.startedAt)}<div className="xs faint">{c.channel} · v{c.version} · {c.durationS ?? 0}s</div></td>
                      <td>
                        <div className="small">{c.summary?.oneLine ?? c.turns.find((x) => x.role === "caller")?.text ?? "—"}</div>
                        <div className="row" style={{ gap: 6, marginTop: 4 }}>
                          {c.urgent && <span className="badge fail"><Icon name="alert" size={11} /> {t("Urgent", "ज़रूरी")}</span>}
                          {c.injectionFlags > 0 && <span className="badge gold"><Icon name="lock" size={11} /> {t("Trick attempt blocked", "चालाकी रोकी")}</span>}
                          {c.callerName && <span className="badge">{c.callerName}</span>}
                        </div>
                      </td>
                      <td className="mono small">{c.bookings[0] ?? <span className="faint">—</span>}</td>
                      <td><span className={`badge ${r[2]}`}>{lang === "hi" ? r[1] : r[0]}</span></td>
                    </tr>
                    {open === c._id && (
                      <tr>
                        <td colSpan={4} style={{ background: "var(--bg)" }}>
                          <div className="col" style={{ gap: 8, maxWidth: 640 }}>
                            {c.turns.map((x, i) => <div key={i} className={`msg ${x.role === "caller" ? "me" : "them"}`} style={{ fontSize: "0.9rem" }}>{x.text}</div>)}
                            {c.bookings.map((bk) => <a key={bk} className="btn btn-outline btn-xs" style={{ alignSelf: "flex-start" }} href={`/api/businesses/${id}/ics/${bk}`}><Icon name="download" size={13} /> {bk}.ics</a>)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <Panel title={t("People to call back", "जिन्हें कॉल बैक करना है")} pad={false}>
          {leads.length === 0 && callbacks.length === 0 && <p className="small faint" style={{ padding: 20 }}>{t("None", "कोई नहीं")}</p>}
          {leads.map((c) => (
            <div key={c._id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--line)" }}>
              <div className="row" style={{ gap: 8, justifyContent: "space-between" }}>
                <div>
                  <strong style={{ fontWeight: 500 }}>{c.lead!.name}</strong> <span className="mono xs faint">{c.lead!.phone}</span>
                  <div className="xs muted">{c.lead!.status}{c.lead!.service ? ` · ${c.lead!.service}` : ""}</div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {c.lead!.urgency === "high" && <span className="badge fail">{t("Urgent", "ज़रूरी")}</span>}
                  <span className="badge wait">{c.lead!.nextAction === "callback" ? t("Callback", "कॉल बैक") : t("Follow-up", "फ़ॉलो-अप")}</span>
                </div>
              </div>
              {c.lead!.reason && <p className="xs faint" style={{ marginTop: 4 }}>{t("Why it didn't book", "बुक क्यों नहीं हुआ")}: {c.lead!.reason}</p>}
              {c.lead!.draft && (
                <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "var(--sunk)" }}>
                  <p className="small">{c.lead!.draft}</p>
                  {c.lead!.phone && (
                    <a className="btn btn-outline btn-xs" style={{ marginTop: 8 }} target="_blank" rel="noreferrer" href={`https://wa.me/91${c.lead!.phone}?text=${encodeURIComponent(c.lead!.draft)}`}>
                      <Icon name="chat" size={13} /> {t("Send on WhatsApp", "WhatsApp पर भेजें")}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
          {callbacks.filter((cb) => !leads.some((l) => l.lead?.phone === cb.phone)).map((cb) => (
            <div key={cb._id} className="row" style={{ padding: "14px 20px", borderBottom: "1px solid var(--line)", justifyContent: "space-between" }}>
              <div>
                <strong style={{ fontWeight: 500 }}>{cb.name || t("Caller", "कॉलर")}</strong> <span className="mono xs faint">{cb.phone}</span>
                <div className="xs muted">{cb.reason}</div>
              </div>
              <a className="btn btn-outline btn-xs" href={`tel:${cb.phone}`}><Icon name="phone" size={13} /> {t("Call", "कॉल")}</a>
            </div>
          ))}
        </Panel>
        <Panel title={t("Upcoming bookings", "आने वाली बुकिंग")} pad={false}>
          {upcoming.length === 0 && <p className="small faint" style={{ padding: 20 }}>{t("None", "कोई नहीं")}</p>}
          {upcoming.map((a) => (
            <div key={a.bookingId} className="row" style={{ padding: "12px 20px", borderBottom: "1px solid var(--line)", flexWrap: "nowrap" }}>
              <span className="tile" style={{ width: 36, height: 36 }}><Icon name="calendar" size={16} /></span>
              <div className="grow">
                <div className="small" style={{ fontWeight: 500 }}>{a.name} · {a.service}</div>
                <div className="xs faint">{when(a.start)} · <span className="mono">{a.bookingId}</span></div>
              </div>
              <a className="btn btn-ghost btn-xs" href={`/api/businesses/${id}/ics/${a.bookingId}`} aria-label={t("Add to calendar", "कैलेंडर में जोड़ें")}><Icon name="download" size={14} /></a>
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}
