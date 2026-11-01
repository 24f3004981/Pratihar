"use client";
import { useEffect, useState } from "react";
import { Icon } from "../Icon";
import { useT } from "../lang";

/** The short link anyone can open to call this business's receptionist from a browser. */
export function CallLink({ id, live }: { id: string; live: boolean }) {
  const { t } = useT();
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/c/${id}`;
  const share = encodeURIComponent(t(`Call our receptionist here: ${link}`, `हमारे रिसेप्शनिस्ट से यहाँ बात कीजिए: ${link}`));

  return (
    <section className="card" style={{ padding: 20 }}>
      <div className="row" style={{ gap: 10, justifyContent: "space-between" }}>
        <div className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
          <span className="tile"><Icon name="phone" /></span>
          <div>
            <h3>{live ? t("Your call link", "आपका कॉल लिंक") : t("Test call link", "टेस्ट कॉल लिंक")}</h3>
            <p className="xs muted">
              {live
                ? t("Anyone who opens it can talk to your receptionist right in their browser.", "जो भी इसे खोलेगा, ब्राउज़र में ही आपके रिसेप्शनिस्ट से बात कर सकता है।")
                : t("Send it to a friend, or open it yourself, to try a real call before going live.", "लाइव होने से पहले असली कॉल आज़माने के लिए किसी दोस्त को भेजिए या खुद खोलिए।")}
            </p>
          </div>
        </div>
      </div>
      <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: "nowrap" }}>
        <input className="input mono" readOnly value={link} onFocus={(e) => e.target.select()} aria-label={t("Call link", "कॉल लिंक")} style={{ fontSize: "0.9rem" }} />
        <button
          className="btn btn-outline"
          style={{ flex: "none" }}
          onClick={() => {
            void navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          <Icon name={copied ? "check" : "copy"} size={16} /> {copied ? t("Copied", "कॉपी हुआ") : t("Copy", "कॉपी")}
        </button>
      </div>
      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <a className="btn" href={`/c/${id}`} target="_blank" rel="noreferrer"><Icon name="phone" size={16} /> {t("Call it now", "अभी कॉल करें")}</a>
        <a className="btn btn-outline" href={`https://wa.me/?text=${share}`} target="_blank" rel="noreferrer"><Icon name="chat" size={16} /> WhatsApp</a>
      </div>
    </section>
  );
}
