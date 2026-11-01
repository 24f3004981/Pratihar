"use client";
import { useEffect, useState } from "react";
import { api } from "../fetcher";
import { useT } from "../lang";
import { PageHead } from "./ui";
import type { TabProps } from "./types";

type Row = { _id: string; at: string; callId: string; tool: string; args: unknown; allowed: boolean; reason?: string };

export default function Security({ data }: TabProps) {
  const { t } = useT();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [onlyDenied, setOnlyDenied] = useState(false);
  useEffect(() => {
    api<Row[]>(`/api/businesses/${data.business._id}/audit`).then(setRows).catch(() => setRows([]));
  }, [data.business._id]);

  const shown = (rows ?? []).filter((r) => !onlyDenied || !r.allowed);
  const denied = (rows ?? []).filter((r) => !r.allowed).length;

  return (
    <>
    <PageHead title={t("Safety log", "सुरक्षा लॉग")} sub={t("Every action Pratihar tried on a call, and whether the safety checks allowed it.", "कॉल पर प्रतिहार ने जो भी किया, और सुरक्षा जाँच ने उसे होने दिया या नहीं।")} />
    <div className="col" style={{ gap: 20 }}>
      <section className="card pad">
        <h3 style={{ marginBottom: 14 }}>{t("What gets checked on every action", "हर काम पर क्या जाँचा जाता है")}</h3>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {[
            ["Intent", "इरादा", "A booking must be for a slot she was shown in the same call.", "बुकिंग उसी कॉल में दिखाए गए स्लॉट की होनी चाहिए।"],
            ["Permission", "अनुमति", "At most 2 bookings per call, 3 per number per day.", "एक कॉल में 2, एक नंबर पर दिन में 3 बुकिंग तक।"],
            ["Clean input", "साफ़ इनपुट", "Names, numbers and dates are checked and stripped before use.", "नाम, नंबर और तारीख़ जाँचकर साफ़ की जाती है।"],
            ["Tricks", "चालाकी", "\"Ignore your rules\" in Hindi or English is flagged and fenced off.", "\"नियम भूल जाओ\" जैसी बातें पकड़ी जाती हैं।"],
            ["Fake bookings", "नकली बुकिंग", "Booking IDs are signed, so made-up ones fail before a lookup.", "बुकिंग आईडी पर सिग्नेचर है, नकली आईडी तुरंत पकड़ी जाती है।"],
          ].map(([en, hi, den, dhi]) => (
            <div key={en}>
              <strong style={{ fontWeight: 600 }}>{t(en, hi)}</strong>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>{t(den, dhi)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card pad">
        <div className="row" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{t("Log", "लॉग")}</h3>
          <span className="muted">{t(`${denied} stopped`, `${denied} रोके गए`)}</span>
          <span className="grow" />
          <label className="row" style={{ fontWeight: 400 }}>
            <input type="checkbox" checked={onlyDenied} onChange={(e) => setOnlyDenied(e.target.checked)} style={{ width: "auto" }} />
            {t("Only what was stopped", "सिर्फ़ रोके गए")}
          </label>
        </div>
        {rows === null ? <span className="spin" /> : shown.length === 0 ? <p className="muted">{t("Nothing yet.", "अभी कुछ नहीं।")}</p> : (
          <div className="scroll-x">
            <table className="table">
              <thead><tr><th>{t("When", "कब")}</th><th>{t("Action", "काम")}</th><th>{t("Decision", "फ़ैसला")}</th><th>{t("Details", "विवरण")}</th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r._id}>
                    <td className="mono muted" style={{ whiteSpace: "nowrap" }}>{new Date(r.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", second: "2-digit" })}</td>
                    <td className="mono">{r.tool}</td>
                    <td><span className={`badge ${r.allowed ? "pass" : "fail"}`}>{r.allowed ? t("allowed", "अनुमति") : t("stopped", "रोका")}</span></td>
                    <td style={{ fontSize: "0.85rem" }}>
                      {r.reason && <div>{r.reason}</div>}
                      <code className="muted" style={{ wordBreak: "break-all" }}>{JSON.stringify(r.args).slice(0, 160)}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
    </>
  );
}
