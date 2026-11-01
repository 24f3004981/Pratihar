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
        <h2 style={{ color: "#fff" }}>{t("See Pratihar at work", "प्रतिहार को काम करते देखिए")}</h2>
        <p style={{ color: "#aab4c0", marginTop: 10 }}>
          {t("One dental clinic, start to finish: setup by talking, 24 practice calls, a real Hinglish booking, an urgent call handed to the doctor, the callback list and the evening brief.", "एक डेंटल क्लिनिक, शुरू से अंत तक: बात करके सेटअप, 24 अभ्यास कॉल, हिंग्लिश में असली बुकिंग, डॉक्टर तक पहुँची ज़रूरी कॉल, कॉल बैक लिस्ट और शाम का ब्रीफ़।")}
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
