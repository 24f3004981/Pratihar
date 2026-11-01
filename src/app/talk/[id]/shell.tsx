"use client";
import Phone from "@/components/Phone";
import { Icon } from "@/components/Icon";
import { LangToggle, useT } from "@/components/lang";
import { Mark } from "@/components/Logo";

export function TalkShell({ id, name, live, ready, embed }: { id: string; name: string; live: boolean; ready: boolean; embed: boolean }) {
  const { t } = useT();
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: embed ? "stretch" : "center", padding: embed ? 0 : "24px 16px" }}>
      <div className="card" style={{ width: "100%", maxWidth: embed ? "none" : 440, borderRadius: embed ? 0 : 28, overflow: "hidden", boxShadow: embed ? "none" : "var(--shadow-lg)", border: embed ? 0 : undefined }}>
        <div className="row" style={{ padding: "16px 18px", borderBottom: "1px solid var(--line)", flexWrap: "nowrap" }}>
          <span className="tile" style={{ borderRadius: 999, background: "var(--brand)", color: "#fff" }}><Icon name="phone" size={18} /></span>
          <div className="grow">
            <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
            <div className="xs muted">{t("AI receptionist · Hindi & English", "AI रिसेप्शनिस्ट · हिंदी और अंग्रेज़ी")}</div>
          </div>
          <LangToggle />
        </div>
        <div style={{ padding: 20, background: "var(--bg)" }}>
          {ready ? (
            <>
              {!live && (
                <div className="row xs" style={{ gap: 6, justifyContent: "center", padding: "6px 10px", borderRadius: 999, background: "var(--gold-soft)", color: "var(--gold-ink)", marginBottom: 10, width: "fit-content", marginInline: "auto" }}>
                  <Icon name="bulb" size={13} /> {t("Test line: this business is still setting up", "टेस्ट लाइन: यह बिज़नेस अभी सेटअप कर रहा है")}
                </div>
              )}
              <p className="xs muted" style={{ textAlign: "center", marginBottom: 8 }}>
                {t("You'll be speaking with an AI receptionist. She can check times, book you in, and get a person to call you back.", "आप एक AI रिसेप्शनिस्ट से बात करेंगे। वह समय देख सकती है, बुक कर सकती है, और किसी इंसान से कॉल बैक करवा सकती है।")}
              </p>
              <Phone businessId={id} channel={embed ? "widget" : "web"} />
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "32px 8px" }}>
              <span className="tile" style={{ width: 52, height: 52, borderRadius: 99, margin: "0 auto" }}><Icon name="clock" size={22} /></span>
              <h3 style={{ marginTop: 14 }}>{t("This line opens soon", "यह लाइन जल्द खुलेगी")}</h3>
              <p className="small muted" style={{ marginTop: 6 }}>{t("The owner is still training their receptionist. Please try again later.", "मालिक अभी रिसेप्शनिस्ट को सिखा रहे हैं। कृपया बाद में कॉल करें।")}</p>
            </div>
          )}
        </div>
        {!embed && (
          <div className="row xs faint" style={{ justifyContent: "center", gap: 6, padding: 12, borderTop: "1px solid var(--line)" }}>
            <Mark size={14} /> {t("Answered by Pratihar · calls may be reviewed to improve service", "जवाब प्रतिहार ने दिया · सेवा सुधारने के लिए कॉल देखी जा सकती है")}
          </div>
        )}
      </div>
    </main>
  );
}
