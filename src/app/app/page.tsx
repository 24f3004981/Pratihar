"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, Unauthorized } from "@/components/fetcher";
import { Icon } from "@/components/Icon";
import { useT } from "@/components/lang";
import { SiteHeader } from "@/components/SiteHeader";

type Biz = { _id: string; name: string; liveVersion: number | null; latestVersion: number; createdAt: string };

export default function Businesses() {
  const { t } = useT();
  const router = useRouter();
  const [list, setList] = useState<Biz[] | null>(null);
  const [err, setErr] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<Biz[]>("/api/businesses")
      .then((l) => {
        setList(l);
        if (!l.length) setAdding(true);
      })
      .catch((e) => !(e instanceof Unauthorized) && setErr(e.message));
  }, []);
  useEffect(() => {
    if (adding) input.current?.focus();
  }, [adding]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const b = await api<Biz>("/api/businesses", { method: "POST", json: { name: name.trim() } });
      router.push(`/app/${b._id}`);
    } catch (e) {
      if (!(e instanceof Unauthorized)) setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader cta={false} />
      <main className="container" style={{ padding: "48px 24px 80px", maxWidth: 760 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: "clamp(1.9rem, 4vw, 2.5rem)" }}>{t("My businesses", "मेरे बिज़नेस")}</h1>
            <p className="muted" style={{ marginTop: 8 }}>{t("Each business gets its own receptionist. Open one to see calls or finish setting it up.", "हर बिज़नेस का अपना रिसेप्शनिस्ट है। कॉल देखने या सेटअप पूरा करने के लिए खोलिए।")}</p>
          </div>
          {!adding && <button className="btn" onClick={() => setAdding(true)}><Icon name="plus" size={16} /> {t("Add a business", "बिज़नेस जोड़ें")}</button>}
        </div>

        {adding && (
          <form onSubmit={create} className="card pad-lg fade-in" style={{ marginTop: 24, borderColor: "var(--brand)", boxShadow: "0 0 0 4px var(--brand-soft)" }}>
            <label className="field">
              <span className="label" style={{ fontSize: "1rem" }}>{list?.length ? t("What's the new business called?", "नए बिज़नेस का नाम?") : t("Let's start. What's your business called?", "शुरू करते हैं। आपके बिज़नेस का नाम क्या है?")}</span>
              <input ref={input} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sharma Dental Clinic" maxLength={80} style={{ height: 48, fontSize: "1.05rem" }} />
              <span className="hint">{t("You can change it later.", "बाद में बदल सकते हैं।")}</span>
            </label>
            <div className="row" style={{ marginTop: 16, gap: 8 }}>
              <button className="btn" disabled={busy || name.trim().length < 2}>{busy && <span className="spin" />} {t("Continue", "आगे बढ़ें")} <Icon name="arrow" size={16} /></button>
              {!!list?.length && <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>{t("Cancel", "रद्द करें")}</button>}
            </div>
          </form>
        )}

        <div className="col" style={{ gap: 12, marginTop: 24 }}>
          {err && <p className="err" role="alert">{err}</p>}
          {list === null && !err && [0, 1].map((i) => <div key={i} className="skeleton" style={{ height: 76, borderRadius: 16 }} />)}
          {list?.map((b) => (
            <Link key={b._id} href={`/app/${b._id}`} className="card row biz" style={{ textDecoration: "none", padding: "16px 20px", flexWrap: "nowrap" }}>
              <span className="tile" style={{ borderRadius: 12 }}><Icon name="store" size={18} /></span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
                <div className="xs faint">{t("Added", "जोड़ा")} {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
              </div>
              {b.liveVersion ? (
                <span className="badge pass"><span className="dot" /> {t("Answering calls", "कॉल ले रहा है")}</span>
              ) : (
                <span className="badge wait">{t("Setup not finished", "सेटअप अधूरा")}</span>
              )}
              <Icon name="arrow" size={16} style={{ color: "var(--ink-3)" }} />
            </Link>
          ))}
        </div>
        <style>{`.biz{transition:border-color .15s, box-shadow .15s}.biz:hover{border-color:var(--line-2);box-shadow:var(--shadow)}`}</style>
      </main>
    </>
  );
}
