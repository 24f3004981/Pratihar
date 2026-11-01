"use client";
import { useEffect, useState } from "react";
import { Icon } from "../Icon";
import { useT } from "../lang";

export function DemoVideo() {
  const { lang: siteLang, t } = useT();
  const [lang, setLang] = useState<"en" | "hi">(siteLang);
  useEffect(() => setLang(siteLang), [siteLang]);

  return (
    <section id="how" style={{ background: "#1b2430", color: "#fff", scrollMarginTop: 64 }}>
      <div className="container" style={{ padding: "80px 24px" }}>
        <h2 style={{ color: "#fff" }}>{t("See Pratihar in 60 seconds", "60 सेकंड में प्रतिहार देखिए")}</h2>
        <p style={{ color: "#aab4c0", marginTop: 10 }}>
          {t("One evening at a dental clinic: the setup, the practice calls, a real booking and the owner's nightly brief.", "एक डेंटल क्लिनिक की एक शाम: सेटअप, अभ्यास कॉल, एक असली बुकिंग और मालिक का रात का ब्रीफ़।")}
        </p>
        <div className="row" style={{ marginTop: 20, gap: 8 }}>
          {(["en", "hi"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className="row"
              style={{ gap: 6, height: 34, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontSize: "0.88rem", border: "1px solid #3a4553", background: lang === l ? "#fff" : "transparent", color: lang === l ? "var(--ink)" : "#d5dbe2" }}
            >
              <Icon name="volume" size={14} /> {l === "en" ? "English" : "हिंदी"}
            </button>
          ))}
        </div>
        <video
          key={lang}
          src={`/video/pratihar-${lang}.mp4`}
          poster={`/video/pratihar-${lang}.jpg`}
          controls
          playsInline
          preload="metadata"
          style={{ display: "block", width: "100%", aspectRatio: "16 / 9", marginTop: 28, borderRadius: 16, background: "#0f151c", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}
        />
      </div>
    </section>
  );
}
