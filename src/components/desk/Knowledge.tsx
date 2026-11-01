"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "../fetcher";
import { useT } from "../lang";
import { PageHead } from "./ui";
import type { TabProps } from "./types";

type Doc = { _id: string; chunks: number; addedAt: string };

export default function Knowledge({ data }: TabProps) {
  const { t } = useT();
  const id = data.business._id;
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<string[] | null>(null);

  const load = useCallback(() => api<{ documents: Doc[] }>(`/api/businesses/${id}/knowledge`).then((r) => setDocs(r.documents)).catch((e) => setErr(e.message)), [id]);
  useEffect(() => {
    void load();
  }, [load]);

  async function upload(file: File) {
    setBusy(true);
    setErr("");
    setMsg("");
    const form = new FormData();
    form.append("file", file);
    try {
      const r = await api<{ file: string; chunks: number; meko: string }>(`/api/businesses/${id}/knowledge`, { method: "POST", body: form });
      setMsg(t(`Read ${r.file}: ${r.chunks} passages. Meko: ${r.meko}.`, `${r.file} पढ़ ली: ${r.chunks} हिस्से। Meko: ${r.meko}।`));
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(file: string) {
    await api(`/api/businesses/${id}/knowledge?file=${encodeURIComponent(file)}`, { method: "DELETE" }).catch((e) => setErr(e.message));
    await load();
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const r = await api<{ results: string[] }>(`/api/businesses/${id}/knowledge?q=${encodeURIComponent(q)}`).catch(() => ({ results: [] }));
    setHits(r.results);
  }

  return (
    <>
    <PageHead title={t("Documents", "दस्तावेज़")} sub={t("Price lists, policies, FAQs and offers. Pratihar answers from these, and only these.", "रेट लिस्ट, नियम, FAQ और ऑफ़र। प्रतिहार सिर्फ़ इन्हीं से जवाब देता है।")} />
    <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", alignItems: "start" }}>
      <section className="card pad col">
        <h3>{t("Your documents", "आपके दस्तावेज़")}</h3>
        <p className="muted" style={{ margin: 0 }}>
          {t("Price list, services catalogue, policies, FAQs, offers. She answers from these, and only these. If something isn't written down, she offers a callback.", "रेट लिस्ट, सर्विस, नियम, FAQ, ऑफ़र। वह सिर्फ़ इन्हीं से जवाब देती है। जो लिखा नहीं, उसके लिए कॉल बैक।")}
        </p>
        <label className="btn btn-outline" style={{ alignSelf: "flex-start", cursor: busy ? "wait" : "pointer" }}>
          {busy ? <span className="spin" /> : "+"} {t("Upload PDF or text", "PDF या टेक्स्ट डालें")}
          <input type="file" accept=".pdf,.txt,.md,.csv,.json" hidden disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        {msg && <p style={{ color: "var(--pass)", margin: 0 }}>{msg}</p>}
        {err && <p className="err">{err}</p>}
        {docs?.length === 0 && <p className="muted">{t("Nothing uploaded yet.", "अभी कुछ नहीं डाला।")}</p>}
        {docs && docs.length > 0 && (
          <table className="table">
            <tbody>
              {docs.map((d) => (
                <tr key={d._id}>
                  <td>{d._id}</td>
                  <td className="muted">{d.chunks} {t("passages", "हिस्से")}</td>
                  <td style={{ textAlign: "right" }}><button className="btn btn-outline btn-sm" onClick={() => remove(d._id)}>{t("Remove", "हटाएँ")}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <form className="card pad col" onSubmit={search}>
        <h3 style={{ margin: 0 }}>{t("Check what she'd find", "देखिए उसे क्या मिलेगा")}</h3>
        <div className="row">
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("e.g. root canal price", "जैसे: रूट कैनाल का रेट")} style={{ flex: 1, minWidth: 0 }} />
          <button className="btn btn-outline" disabled={!q.trim()}>{t("Search", "खोजें")}</button>
        </div>
        {hits?.length === 0 && <p className="muted" style={{ margin: 0 }}>{t("Nothing found. On a call she would offer a callback here.", "कुछ नहीं मिला। कॉल पर वह यहाँ कॉल बैक ऑफ़र करेगी।")}</p>}
        {hits?.map((h, i) => <p key={i} style={{ margin: 0, fontSize: "0.9rem", borderLeft: "3px solid var(--gold)", paddingLeft: 10 }}>{h}</p>)}
      </form>
    </div>
    </>
  );
}
