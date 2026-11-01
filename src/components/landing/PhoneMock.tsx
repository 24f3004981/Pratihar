"use client";
import { useEffect, useState } from "react";
import { Icon } from "../Icon";
import { useT } from "../lang";

type Line = { who: "ai" | "caller" | "tool"; en: string; hi: string };
const CALLS: { name: string; lines: Line[] }[] = [
  {
    name: "Sharma Dental Clinic",
    lines: [
      { who: "ai", en: "Hello, this is the AI receptionist at Sharma Dental. How can I help?", hi: "नमस्ते, मैं शर्मा डेंटल की AI रिसेप्शनिस्ट हूँ। बताइए, क्या मदद करूँ?" },
      { who: "caller", en: "Kal cleaning ho jayegi? Kitne ka hai?", hi: "कल सफ़ाई हो जाएगी? कितने की है?" },
      { who: "tool", en: "Checked tomorrow's calendar", hi: "कल का कैलेंडर देखा" },
      { who: "ai", en: "Cleaning is ₹1,200. Tomorrow 11:00 or 5:30 is free. Which one suits you?", hi: "सफ़ाई ₹1,200 की है। कल 11:00 या 5:30 खाली है। कौन सा ठीक रहेगा?" },
      { who: "caller", en: "5:30. Rahul, 98100 22310.", hi: "5:30। राहुल, 98100 22310।" },
      { who: "ai", en: "Done. Your booking ID is PRT-4K9QZD. See you tomorrow, Rahul ji.", hi: "हो गया। आपकी बुकिंग आईडी PRT-4K9QZD है। कल मिलते हैं, राहुल जी।" },
    ],
  },
  {
    name: "Spice Route Kitchen",
    lines: [
      { who: "ai", en: "Spice Route Kitchen, AI assistant speaking. How can I help?", hi: "स्पाइस रूट किचन, AI असिस्टेंट बोल रही हूँ। बताइए?" },
      { who: "caller", en: "Saturday raat 8 baje, 6 log ke liye table milega?", hi: "शनिवार रात 8 बजे, 6 लोगों की टेबल मिलेगी?" },
      { who: "tool", en: "Checked Saturday's tables", hi: "शनिवार की टेबल देखीं" },
      { who: "ai", en: "8:00 is full, but 8:30 is open for six. Shall I hold it?", hi: "8:00 भरा है, पर 8:30 पर छह लोगों की टेबल है। रख दूँ?" },
    ],
  },
  {
    name: "Glow Studio Salon",
    lines: [
      { who: "ai", en: "Glow Studio, this is the AI receptionist. How can I help?", hi: "ग्लो स्टूडियो, मैं AI रिसेप्शनिस्ट हूँ। बताइए?" },
      { who: "caller", en: "Keratin treatment ka rate kya hai?", hi: "केराटिन ट्रीटमेंट का रेट क्या है?" },
      { who: "tool", en: "Searched the price list", hi: "रेट लिस्ट में देखा" },
      { who: "ai", en: "Keratin isn't on our list yet. Can I take your number so the owner calls you back today?", hi: "केराटिन अभी लिस्ट में नहीं है। नंबर दे दीजिए, आज ही मालिक कॉल करेंगे।" },
    ],
  },
];

export function PhoneMock() {
  const { lang, t } = useT();
  const [call, setCall] = useState(0);
  const [shown, setShown] = useState(1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(CALLS[call].lines.length);
      return;
    }
    const total = CALLS[call].lines.length;
    const id = setTimeout(
      () => {
        if (shown < total) setShown(shown + 1);
        else {
          setCall((call + 1) % CALLS.length);
          setShown(1);
        }
      },
      shown < total ? 1500 : 3200,
    );
    return () => clearTimeout(id);
  }, [call, shown]);

  const c = CALLS[call];
  return (
    <div style={{ position: "relative", padding: "28px 0" }}>
      <div aria-hidden style={{ position: "absolute", inset: "0 6% 0 6%", background: "var(--gold-soft)", borderRadius: 40, transform: "rotate(-3deg)", opacity: 0.7 }} />
      <div
        role="img"
        aria-label={t("Example call answered by Pratihar", "प्रतिहार की एक नमूना कॉल")}
        style={{ position: "relative", width: "min(360px, 100%)", margin: "0 auto", background: "var(--ink)", borderRadius: 44, padding: 12, boxShadow: "var(--shadow-lg)" }}
      >
        <div style={{ background: "var(--bg)", borderRadius: 34, overflow: "hidden", height: 520, display: "flex", flexDirection: "column" }}>
          <div className="row" style={{ padding: "18px 18px 14px", background: "var(--surface)", borderBottom: "1px solid var(--line)", flexWrap: "nowrap" }}>
            <span className="tile" style={{ position: "relative", borderRadius: 999, background: "var(--brand)", color: "#fff", width: 44, height: 44 }}>
              <Icon name="phone" size={18} />
              <span style={{ position: "absolute", top: 1, right: 1, width: 10, height: 10, borderRadius: 99, background: "#e9a521", border: "2px solid #fff" }} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
              <div className="xs row" style={{ gap: 6, color: "var(--pass)" }}>
                <span className="dot live" /> {t("Live call · Answered by Pratihar", "लाइव कॉल · जवाब प्रतिहार ने दिया")}
              </div>
            </div>
          </div>
          <div className="col" style={{ padding: 16, gap: 10, flex: 1, overflow: "hidden", justifyContent: "flex-start" }} aria-live="off">
            {c.lines.slice(0, shown).map((l, i) =>
              l.who === "tool" ? (
                <div key={`${call}-${i}`} className="msg note fade-in row" style={{ gap: 6, display: "inline-flex", alignSelf: "center" }}>
                  <Icon name="check" size={13} /> {lang === "hi" ? l.hi : l.en}
                </div>
              ) : (
                <div key={`${call}-${i}`} className={`msg ${l.who === "ai" ? "them" : "me"} fade-in`}>
                  {lang === "hi" ? l.hi : l.en}
                </div>
              ),
            )}
          </div>
          <div className="row" style={{ justifyContent: "center", gap: 6, padding: 14 }}>
            {CALLS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setCall(i);
                  setShown(1);
                }}
                aria-label={`${t("Show call", "कॉल दिखाएँ")} ${i + 1}`}
                style={{ width: i === call ? 22 : 7, height: 7, borderRadius: 99, border: 0, padding: 0, cursor: "pointer", background: i === call ? "var(--brand)" : "var(--line-2)", transition: "width .25s" }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
