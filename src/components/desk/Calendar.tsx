"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "../fetcher";
import { useT } from "../lang";
import { PageHead } from "./ui";
import type { TabProps } from "./types";

type Appt = { _id: string; bookingId: string; start: string; end: string; service: string; name: string; phone: string; status: string; source: string; history: { at: string; what: string }[] };
type Cal = { from: string; days: number; grid: { date: string; slots: string[] }[]; appointments: Appt[] };

const istTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
const istDay = (date: string, lang: string) =>
  new Date(`${date}T12:00:00+05:30`).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const istDate = (iso: string) => new Date(new Date(iso).getTime() + 330 * 60000).toISOString().slice(0, 10);
const todayIst = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const shift = (d: string, n: number) => new Date(new Date(`${d}T12:00:00+05:30`).getTime() + n * 86400000 + 330 * 60000).toISOString().slice(0, 10);

export default function Calendar({ data }: TabProps) {
  const { t, lang } = useT();
  const id = data.business._id;
  const services = data.business.card?.services ?? [];
  const [from, setFrom] = useState(todayIst());
  const [days, setDays] = useState(7);
  const [cal, setCal] = useState<Cal | null>(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<{ slot?: string; appt?: Appt } | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", service: services[0]?.name ?? "" });
  const [moving, setMoving] = useState<Appt | null>(null);
  const [phone, setPhone] = useState("");
  const [history, setHistory] = useState<Appt[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setCal(await api<Cal>(`/api/businesses/${id}/calendar?from=${from}&days=${days}`));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [id, from, days]);
  useEffect(() => {
    void load();
  }, [load]);

  async function post(json: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    try {
      await api(`/api/businesses/${id}/calendar`, { method: "POST", json });
      setSel(null);
      setMoving(null);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function findHistory(e: React.FormEvent) {
    e.preventDefault();
    const r = await api<{ history: Appt[] }>(`/api/businesses/${id}/calendar?phone=${encodeURIComponent(phone)}`).catch(() => ({ history: [] }));
    setHistory(r.history);
  }

  if (!cal) return err ? <p className="err">{err}</p> : <span className="spin" />;
  const live = cal.appointments.filter((a) => a.status === "booked");
  const byStart = new Map(live.map((a) => [new Date(a.start).toISOString(), a]));
  const now = Date.now();
  const totalSlots = cal.grid.reduce((n, d) => n + d.slots.length, 0);

  return (
    <>
    <PageHead title={t("Calendar", "कैलेंडर")} sub={t("Every booking, whoever made it. Two people can never hold the same slot.", "हर बुकिंग, किसी ने भी की हो। एक स्लॉट दो लोगों को कभी नहीं मिलता।")} />
    <div className="col" style={{ gap: 20 }}>
      <div className="row">
        <button className="btn btn-outline btn-sm" onClick={() => setFrom(shift(from, -days))} aria-label={t("Earlier", "पहले")}>←</button>
        <button className="btn btn-outline btn-sm" onClick={() => setFrom(todayIst())}>{t("Today", "आज")}</button>
        <button className="btn btn-outline btn-sm" onClick={() => setFrom(shift(from, days))} aria-label={t("Later", "बाद में")}>→</button>
        <span className="muted">{istDay(from, lang)} – {istDay(shift(from, days - 1), lang)}</span>
        <span className="grow" />
        <span className="muted">{t(`${live.length} booked of ${totalSlots} slots`, `${totalSlots} में से ${live.length} बुक`)}</span>
        <button className={`chip ${days === 1 ? "on" : ""}`} onClick={() => setDays(1)}>{t("Day", "दिन")}</button>
        <button className={`chip ${days === 7 ? "on" : ""}`} onClick={() => setDays(7)}>{t("Week", "हफ़्ता")}</button>
      </div>
      {moving && (
        <div className="card pad row" style={{ borderColor: "var(--brand)", background: "var(--brand-soft)", padding: 12 }}>
          {t(`Pick a new open slot for ${moving.name}`, `${moving.name} के लिए नया खाली स्लॉट चुनें`)}
          <span className="grow" />
          <button className="btn btn-outline btn-sm" onClick={() => setMoving(null)}>{t("Cancel", "रद्द")}</button>
        </div>
      )}
      {err && <p className="err" role="alert">{err}</p>}
      {cal.grid.length === 0 && <p className="muted">{t("Add working hours on the Card screen to see slots.", "स्लॉट देखने के लिए कार्ड में टाइमिंग डालें।")}</p>}

      <div className="scroll-x">
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cal.grid.length}, minmax(${days === 1 ? 280 : 130}px, 1fr))`, gap: 8 }}>
          {cal.grid.map((d) => (
            <div key={d.date} className="col" style={{ gap: 6, alignContent: "start" }}>
              <div style={{ fontWeight: 600, padding: "4px 2px", borderBottom: "1px solid var(--line-2)", color: "var(--ink-2)", fontSize: "0.85rem" }}>{istDay(d.date, lang)}</div>
              {d.slots.length === 0 && <div className="muted" style={{ fontSize: "0.85rem" }}>{t("Closed", "बंद")}</div>}
              {d.slots.map((s) => {
                const a = byStart.get(s);
                const past = new Date(s).getTime() < now;
                return (
                  <button
                    key={s}
                    disabled={past && !a}
                    onClick={() => (moving ? !a && post({ action: "reschedule", bookingId: moving.bookingId, start: s }) : setSel(a ? { appt: a } : { slot: s }))}
                    style={{
                      font: "inherit", fontSize: "0.85rem", textAlign: "left", padding: "8px 10px", borderRadius: 8, cursor: past && !a ? "default" : "pointer",
                      border: `1px solid ${a ? "var(--brand)" : "var(--line)"}`,
                      background: a ? "var(--brand)" : past ? "transparent" : "var(--surface)",
                      color: a ? "#fff" : past ? "var(--ink-3)" : "var(--ink)",
                      opacity: past && !a ? 0.5 : 1,
                    }}
                  >
                    <span className="mono">{istTime(s)}</span> {a ? `· ${a.name}` : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {sel?.slot && (
        <form className="card pad col" onSubmit={(e) => { e.preventDefault(); void post({ action: "book", start: sel.slot, ...form }); }}>
          <strong>{t("Book", "बुक करें")} {istDay(istDate(sel.slot), lang)} · {istTime(sel.slot)}</strong>
          <div className="row">
            <input className="input" placeholder={t("Name", "नाम")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={{ flex: 1, minWidth: 140 }} />
            <input className="input" placeholder={t("Mobile", "मोबाइल")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required inputMode="tel" style={{ flex: 1, minWidth: 140 }} />
            <select className="select" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} style={{ flex: 1, minWidth: 140 }}>
              {services.map((s) => <option key={s.name}>{s.name}</option>)}
              {services.length === 0 && <option value="Appointment">Appointment</option>}
            </select>
          </div>
          <div className="row">
            <button className="btn" disabled={busy}>{t("Book", "बुक")}</button>
            <button type="button" className="btn btn-outline" onClick={() => setSel(null)}>{t("Close", "बंद")}</button>
          </div>
        </form>
      )}

      {sel?.appt && (
        <div className="card pad col">
          <div className="row">
            <strong>{sel.appt.name}</strong>
            <span className="muted mono">{sel.appt.phone}</span>
            <span className="badge">{sel.appt.source}</span>
            <span className="grow" />
            <code>{sel.appt.bookingId}</code>
          </div>
          <div>{sel.appt.service} · {istDay(istDate(sel.appt.start), lang)} {istTime(sel.appt.start)}</div>
          <ul className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: "0.85rem" }}>
            {sel.appt.history.map((h, i) => <li key={i}>{new Date(h.at).toLocaleString("en-IN")}: {h.what}</li>)}
          </ul>
          <div className="row">
            <a className="btn btn-outline btn-sm" href={`/api/businesses/${id}/ics/${sel.appt.bookingId}`}>{t("Add to Google Calendar (.ics)", "Google कैलेंडर में (.ics)")}</a>
            <button className="btn btn-outline btn-sm" onClick={() => { setMoving(sel.appt!); setSel(null); }}>{t("Reschedule", "समय बदलें")}</button>
            <button className="btn btn-outline btn-sm" style={{ color: "var(--fail)" }} disabled={busy} onClick={() => confirm(t("Cancel this booking?", "यह बुकिंग रद्द करें?")) && post({ action: "cancel", bookingId: sel.appt!.bookingId })}>
              {t("Cancel booking", "बुकिंग रद्द")}
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setSel(null)}>{t("Close", "बंद")}</button>
          </div>
        </div>
      )}

      <form className="card pad col" onSubmit={findHistory}>
        <h3 style={{ margin: 0 }}>{t("Look up a customer", "ग्राहक खोजें")}</h3>
        <div className="row">
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("Mobile number", "मोबाइल नंबर")} inputMode="tel" style={{ flex: 1, minWidth: 0 }} />
          <button className="btn btn-outline">{t("Search", "खोजें")}</button>
        </div>
        {history && (history.length === 0 ? <p className="muted" style={{ margin: 0 }}>{t("No visits on record.", "कोई रिकॉर्ड नहीं।")}</p> : (
          <table className="table">
            <tbody>
              {history.map((a) => (
                <tr key={a._id}>
                  <td>{istDay(istDate(a.start), lang)} {istTime(a.start)}</td>
                  <td>{a.service}</td>
                  <td><span className={`badge ${a.status === "booked" ? "pass" : ""}`}>{a.status}</span></td>
                  <td className="mono">{a.bookingId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </form>
    </div>
    </>
  );
}
