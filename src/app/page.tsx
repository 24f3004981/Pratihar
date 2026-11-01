"use client";
import { Icon } from "@/components/Icon";
import { useT } from "@/components/lang";
import { PhoneMock } from "@/components/landing/PhoneMock";
import { AfterTheCall, PracticeDemo, StartCTA, Steps, Trust } from "@/components/landing/Sections";
import { DemoVideo } from "@/components/landing/DemoVideo";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  const { t } = useT();
  return (
    <>
      <SiteHeader />
      <main>
        <section className="container" style={{ padding: "56px 24px 72px", display: "grid", gap: 40, gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", alignItems: "center" }}>
          <div>
            <span className="eyebrow">{t("For clinics, salons, shops, restaurants and every small business", "क्लिनिक, सैलून, दुकान, रेस्टोरेंट और हर छोटे बिज़नेस के लिए")}</span>
            <h1 style={{ marginTop: 20 }}>
              {t("Your phone, answered.", "आपका फ़ोन, उठाया गया।")}
              <br />
              {t("Even when you can't.", "तब भी, जब आप न उठा सकें।")}
            </h1>
            <p className="muted" style={{ fontSize: "1.15rem", marginTop: 20, maxWidth: 560, lineHeight: 1.65 }}>
              {t(
                "Explain your business to Pratihar the way you'd brief a new receptionist. It picks up every call in Hindi or English, books visits and tells you who needs a call back.",
                "प्रतिहार को अपना बिज़नेस वैसे समझाइए जैसे नए रिसेप्शनिस्ट को समझाते हैं। वह हर कॉल हिंदी या अंग्रेज़ी में उठाता है, विज़िट बुक करता है और बताता है किसे कॉल बैक चाहिए।",
              )}
            </p>
            <div className="row" style={{ marginTop: 28, gap: 12 }}>
              <a href="#start" className="btn">{t("Build my receptionist", "मेरा रिसेप्शनिस्ट बनाइए")} <Icon name="arrow" size={16} /></a>
              <a href="#how" className="btn btn-outline">
                <span style={{ width: 26, height: 26, borderRadius: 99, background: "var(--gold)", color: "#fff", display: "grid", placeItems: "center" }}><Icon name="play" size={12} fill /></span>
                {t("Watch how it works", "देखिए कैसे काम करता है")}
              </a>
            </div>
            <p className="small faint" style={{ marginTop: 14 }}>{t("No coding. Takes about 5 minutes.", "कोई कोडिंग नहीं। लगभग 5 मिनट।")}</p>
          </div>
          <PhoneMock />
        </section>

        <DemoVideo />
        <Steps />
        <PracticeDemo />
        <AfterTheCall />
        <Trust />
        <StartCTA />
      </main>
    </>
  );
}
