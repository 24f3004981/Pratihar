"use client";
import { useEffect, useState } from "react";
import { api } from "../fetcher";
import { Icon } from "../Icon";
import { useT } from "../lang";
import { PageHead } from "./ui";
import type { TabProps } from "./types";

export default function GoLive({ data, reload }: TabProps) {
  const { t } = useT();
  const b = data.business;
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  async function act(version: number, action: "live" | "rollback") {
    setBusy(version);
    setErr("");
    setMsg("");
    try {
      const r = await api<{ liveVersion: number; phone: { agentId?: string; error?: string } }>(`/api/businesses/${b._id}/golive`, { method: "POST", json: { version, action } });
      setMsg(action === "live" ? t(`Version ${r.liveVersion} is now answering your calls.`, `वर्ज़न ${r.liveVersion} अब आपकी कॉल उठा रहा है।`) : t(`Rolled back to version ${r.liveVersion}.`, `वर्ज़न ${r.liveVersion} पर वापस।`));
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const copy = (k: string, s: string) => {
    void navigator.clipboard.writeText(s);
    setCopied(k);
    setTimeout(() => setCopied(""), 1500);
  };

  const link = `${origin}/c/${b._id}`;
  const snippet = `<script src="${origin}/embed.js" data-business="${b._id}"${b.elevenAgentId ? ` data-agent="${b.elevenAgentId}"` : ""} async></script>`;

  return (
    <>
      <PageHead title={t("Go live", "लाइव करें")} sub={t("A version can take real calls only after it passes practice: 90% overall, and every fix you taught it passes all three times.", "कोई वर्ज़न असली कॉल तभी लेगा जब प्रैक्टिस पास करे: कुल 90%, और आपका हर सुधार तीनों बार पास।")} />

      {b.liveVersion && (
        <div className="card pad-lg" style={{ marginBottom: 20, background: "var(--brand-soft)", borderColor: "#c5e3e3" }}>
          <div className="row" style={{ gap: 10 }}>
            <span className="dot live" />
            <strong style={{ fontWeight: 600 }}>{t(`Version ${b.liveVersion} is answering calls`, `वर्ज़न ${b.liveVersion} कॉल उठा रहा है`)}</strong>
          </div>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginTop: 18 }}>
            <div className="card pad">
              <div className="row" style={{ gap: 8 }}><Icon name="phone" size={16} style={{ color: "var(--brand)" }} /><h3>{t("Customer call link", "ग्राहकों का लिंक")}</h3></div>
              <p className="xs muted" style={{ marginTop: 4 }}>{t("Share on WhatsApp, Google Maps, or a QR code at the counter.", "WhatsApp, Google Maps या काउंटर के QR कोड पर लगाइए।")}</p>
              <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: "nowrap" }}>
                <input className="input mono" readOnly value={link} onFocus={(e) => e.target.select()} aria-label={t("Call link", "कॉल लिंक")} style={{ fontSize: "0.8rem" }} />
                <button className="btn btn-outline btn-sm" onClick={() => copy("l", link)} aria-label={t("Copy", "कॉपी")}>{copied === "l" ? <Icon name="check" size={14} /> : <Icon name="copy" size={14} />}</button>
                <a className="btn btn-sm" href={link} target="_blank" rel="noreferrer" aria-label={t("Open", "खोलें")}><Icon name="external" size={14} /></a>
              </div>
            </div>
            <div className="card pad">
              <div className="row" style={{ gap: 8 }}><Icon name="chat" size={16} style={{ color: "var(--brand)" }} /><h3>{t("Website button", "वेबसाइट बटन")}</h3></div>
              <p className="xs muted" style={{ marginTop: 4 }}>{t("Paste this before </body> on your site.", "इसे अपनी साइट पर </body> से पहले लगाइए।")}</p>
              <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: "nowrap" }}>
                <input className="input mono" readOnly value={snippet} onFocus={(e) => e.target.select()} aria-label={t("Embed code", "एम्बेड कोड")} style={{ fontSize: "0.75rem" }} />
                <button className="btn btn-outline btn-sm" onClick={() => copy("s", snippet)} aria-label={t("Copy", "कॉपी")}>{copied === "s" ? <Icon name="check" size={14} /> : <Icon name="copy" size={14} />}</button>
              </div>
            </div>
            <div className="card pad">
              <div className="row" style={{ gap: 8 }}><Icon name="building" size={16} style={{ color: "var(--brand)" }} /><h3>{t("Phone number", "फ़ोन नंबर")}</h3></div>
              <p className="xs muted" style={{ marginTop: 4 }}>
                {b.elevenAgentId
                  ? t("Connected to ElevenLabs. Attach your Twilio or SIP number there; calls use this same calendar and safety checks.", "ElevenLabs से जुड़ा है। वहाँ Twilio या SIP नंबर जोड़िए; कॉल इसी कैलेंडर और सुरक्षा से चलेंगी।")
                  : t("Needs an ElevenLabs key, a public web address for Pratihar, and a Twilio or SIP number. The call link works without them.", "इसके लिए ElevenLabs की, पब्लिक वेब पता और Twilio/SIP नंबर चाहिए। कॉल लिंक इनके बिना भी चलता है।")}
              </p>
              {b.elevenAgentId && <code className="xs" style={{ display: "block", marginTop: 8 }}>{b.elevenAgentId}</code>}
            </div>
          </div>
        </div>
      )}

      {msg && <p className="ok" style={{ marginBottom: 12 }}>{msg}</p>}
      {err && <p className="err" style={{ marginBottom: 12 }}>{err}</p>}

      <section className="card" style={{ overflow: "hidden" }}>
        <div className="row" style={{ padding: "14px 20px", borderBottom: "1px solid var(--line)" }}><h3>{t("Versions", "वर्ज़न")}</h3></div>
        <div className="scroll-x">
          <table className="table">
            <thead><tr><th>{t("Version", "वर्ज़न")}</th><th>{t("What changed", "क्या बदला")}</th><th>{t("Practice", "प्रैक्टिस")}</th><th style={{ textAlign: "right" }}>{t("Status", "स्थिति")}</th></tr></thead>
            <tbody>
              {data.versions.map((v) => {
                const r = v.run;
                const rate = r && r.total ? r.passed / r.total : 0;
                const live = b.liveVersion === v.n;
                return (
                  <tr key={v.n} style={live ? { background: "#f6fbfb" } : undefined}>
                    <td><span className="mono">v{v.n}</span></td>
                    <td>
                      {v.note}
                      <div className="xs faint">{new Date(v.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
                    </td>
                    <td>
                      {!r ? <span className="badge">{t("not practised", "प्रैक्टिस नहीं")}</span>
                        : r.status === "running" ? <span className="badge wait">{r.done}/{r.total}…</span>
                        : <span className={`badge ${rate >= 0.9 ? "pass" : "fail"}`}>{r.passed}/{r.total} {t("passed", "पास")}</span>}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {live ? (
                        <span className="badge pass"><span className="dot" /> {t("Live", "लाइव")}</span>
                      ) : b.liveVersion && v.n < b.liveVersion ? (
                        <button className="btn btn-outline btn-xs" disabled={busy !== null} onClick={() => act(v.n, "rollback")}>
                          {busy === v.n ? <span className="spin" /> : <Icon name="undo" size={13} />} {t("Roll back", "वापस जाएँ")}
                        </button>
                      ) : (
                        <button className="btn btn-xs" disabled={busy !== null || !r || r.status !== "done" || rate < 0.9} onClick={() => act(v.n, "live")}>
                          {busy === v.n ? <span className="spin" /> : <Icon name="flag" size={13} />} {t("Go live", "लाइव करें")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
