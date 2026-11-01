"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, Unauthorized } from "../fetcher";
import { Icon, type IconName } from "../Icon";
import { useT } from "../lang";

export function Steps() {
  const { t } = useT();
  const steps: [IconName, string, string, string, string][] = [
    ["mic", "Explain the job", "काम समझाइए", "Speak or type, like you're briefing a new staff member. Pratihar turns it into a simple rule card you can read and edit.", "बोलकर या लिखकर, जैसे नए स्टाफ़ को समझाते हैं। प्रतिहार इसे एक आसान नियम कार्ड बना देता है।"],
    ["shield", "Watch it practise", "प्रैक्टिस देखिए", "Before any customer calls, Pratihar tries 8 tricky calls on itself, three times each. You see every answer it gave.", "किसी ग्राहक से पहले, प्रतिहार 8 मुश्किल कॉल खुद पर आज़माता है, हर एक तीन बार। हर जवाब आप देखते हैं।"],
    ["flag", "Fix in one sentence, then go live", "एक लाइन में सुधारिए, फिर लाइव", "If it gets something wrong, just say what it should have done. It goes live only when every important test passes.", "गलती हो तो बस बताइए क्या करना चाहिए था। सारे ज़रूरी टेस्ट पास होने पर ही लाइव होता है।"],
  ];
  return (
    <section style={{ background: "var(--bg)" }}>
      <div className="container" style={{ padding: "80px 24px" }}>
        <h2>{t("Three steps. No technical words.", "तीन कदम। कोई तकनीकी शब्द नहीं।")}</h2>
        <div style={{ display: "grid", gap: 16, marginTop: 28, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {steps.map(([icon, en, hi, den, dhi], i) => (
            <div key={en} className="card pad-lg">
              <div className="row" style={{ gap: 12 }}>
                <span className="tile"><Icon name={icon} /></span>
                <span style={{ color: "var(--gold)", fontSize: "1.3rem" }}>{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 style={{ marginTop: 18 }}>{t(en, hi)}</h3>
              <p className="muted" style={{ marginTop: 6, fontSize: "0.95rem" }}>{t(den, dhi)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const DEMOS = {
  clinic: {
    q: ["How much is teeth whitening?", "दाँत सफ़ेद करवाने का कितना लगेगा?"],
    first: ["Teeth whitening is ₹3,000.", "दाँत सफ़ेद करवाने का ₹3,000 है।"],
    fix: ["If a price isn't on my list, don't guess. Offer a call back.", "रेट लिस्ट में नहीं है तो अंदाज़ा मत लगाओ। कॉल बैक ऑफ़र करो।"],
    after: ["Whitening isn't on our price list, so I can't confirm it. Can I take your number so the clinic calls you back?", "व्हाइटनिंग हमारी रेट लिस्ट में नहीं है, तो मैं पक्का नहीं बता सकती। नंबर दे दीजिए, क्लिनिक से कॉल आ जाएगी।"],
  },
  salon: {
    q: ["Can I get a haircut at 9 pm tonight?", "आज रात 9 बजे हेयरकट हो जाएगा?"],
    first: ["Sure, I've booked you for 9 pm.", "जी, रात 9 बजे बुक कर दिया।"],
    fix: ["We close at 8. Never book after closing, offer tomorrow morning.", "हम 8 बजे बंद करते हैं। बंद होने के बाद बुक मत करो, कल सुबह ऑफ़र करो।"],
    after: ["We close at 8 tonight. Tomorrow 10:30 or 11:00 is free. Which one works?", "आज हम 8 बजे बंद हो जाते हैं। कल 10:30 या 11:00 खाली है। कौन सा ठीक रहेगा?"],
  },
  restaurant: {
    q: ["Is the paneer tikka made without onion and garlic?", "पनीर टिक्का बिना प्याज़-लहसुन का बनता है?"],
    first: ["Yes, all our dishes can be made Jain.", "हाँ, हमारी हर डिश जैन बन सकती है।"],
    fix: ["For allergies or Jain food, never promise. Ask the kitchen to call.", "एलर्जी या जैन खाने का वादा मत करो। किचन से कॉल करवाओ।"],
    after: ["I don't want to promise that without checking. Can the kitchen call you in ten minutes to confirm?", "बिना पूछे मैं वादा नहीं करूँगी। किचन दस मिनट में कॉल करके बता दे?"],
  },
} as const;

export function PracticeDemo() {
  const { t, lang } = useT();
  const [biz, setBiz] = useState<keyof typeof DEMOS>("clinic");
  const d = DEMOS[biz];
  const L = (p: readonly [string, string]) => (lang === "hi" ? p[1] : p[0]);
  const tabs: [keyof typeof DEMOS, IconName, string, string][] = [
    ["clinic", "tooth", "Clinic", "क्लिनिक"],
    ["salon", "scissors", "Salon", "सैलून"],
    ["restaurant", "utensils", "Restaurant", "रेस्टोरेंट"],
  ];
  return (
    <section style={{ background: "var(--surface)", borderBlock: "1px solid var(--line)" }}>
      <div className="container" style={{ padding: "80px 24px", display: "grid", gap: 40, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", alignItems: "start" }}>
        <div>
          <h2>{t("It practises before it talks to your customers", "ग्राहकों से पहले, यह खुद पर अभ्यास करता है")}</h2>
          <p className="muted" style={{ marginTop: 12 }}>{t("Pick a business and see a real mistake get caught and fixed.", "एक बिज़नेस चुनिए और देखिए गलती कैसे पकड़ी और सुधारी जाती है।")}</p>
          <div className="row" style={{ marginTop: 20, gap: 8 }} role="tablist">
            {tabs.map(([k, icon, en, hi]) => (
              <button key={k} role="tab" aria-selected={biz === k} aria-pressed={biz === k} className="chip" onClick={() => setBiz(k)}>
                <Icon name={icon} size={15} /> {t(en, hi)}
              </button>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: 18, background: "var(--bg)" }} key={biz}>
          <div className="xs faint" style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}>{t("Caller", "कॉलर")}</div>
          <p style={{ marginTop: 4 }}>“{L(d.q)}”</p>
          <div className="col fade-in" style={{ gap: 10, marginTop: 12 }}>
            <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--fail-soft)", border: "1px solid #f1cfc9" }}>
              <div className="row xs" style={{ gap: 6, color: "var(--fail)" }}><Icon name="x" size={13} /> {t("First try", "पहली कोशिश")}</div>
              <p className="small" style={{ marginTop: 4 }}>{L(d.first)}</p>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--gold-soft)", border: "1px solid #f3d3b8" }}>
              <div className="row xs" style={{ gap: 6, color: "var(--gold-ink)" }}><Icon name="bulb" size={13} /> {t("Your fix", "आपका सुधार")}</div>
              <p className="small" style={{ marginTop: 4, fontStyle: "italic" }}>“{L(d.fix)}”</p>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--pass-soft)", border: "1px solid #cfe3d6" }}>
              <div className="row xs" style={{ gap: 6, color: "var(--pass)" }}><Icon name="check" size={13} /> {t("After your one-line fix", "एक लाइन के सुधार के बाद")}</div>
              <p className="small" style={{ marginTop: 4 }}>{L(d.after)}</p>
            </div>
          </div>
          <div className="row xs faint" style={{ gap: 6, marginTop: 12 }}><Icon name="shield" size={13} /> {t("Caught before any customer heard it. Saved as a test it must pass forever.", "किसी ग्राहक के सुनने से पहले पकड़ा गया। अब यह हमेशा का टेस्ट है।")}</div>
        </div>
      </div>
    </section>
  );
}

export function AfterTheCall() {
  const { t } = useT();
  const leads: [string, string, string, string, string, string][] = [
    ["Rahul", "Price enquiry", "दाम पूछा", "Callback", "कॉल बैक", "wait"],
    ["Priya", "Booking not finished", "बुकिंग अधूरी", "Follow-up", "फ़ॉलो-अप", "gold"],
    ["Aman", "Appointment confirmed", "अपॉइंटमेंट पक्का", "No action", "कुछ नहीं", "pass"],
  ];
  const hours = [2, 3, 6, 9, 7, 4, 3, 5, 8, 10, 6, 3];
  return (
    <section id="after" style={{ background: "var(--bg)", scrollMarginTop: 64 }}>
      <div className="container" style={{ padding: "80px 24px" }}>
        <h2 style={{ maxWidth: 680 }}>{t("When the call ends, Pratihar keeps working", "कॉल खत्म होने के बाद भी प्रतिहार काम करता रहता है")}</h2>
        <p className="muted" style={{ marginTop: 10, maxWidth: 640 }}>
          {t("Everything below runs on the calls and bookings you already have. No extra setup, no extra bill.", "नीचे का सब कुछ आपकी मौजूदा कॉल और बुकिंग से चलता है। कोई अलग सेटअप या खर्च नहीं।")}
        </p>

        <div className="bento" style={{ marginTop: 32 }}>
          <div className="card pad-lg b-wide">
            <h3>{t("Missed lead recovery", "छूटी लीड वापस")}</h3>
            <p className="muted small" style={{ marginTop: 8 }}>{t("Someone called but didn't book? You see what they wanted, why it stalled, how urgent it is, and a follow-up message ready to send.", "किसी ने कॉल किया पर बुक नहीं किया? क्या चाहिए था, क्यों रुका, कितना ज़रूरी, और भेजने को तैयार मैसेज।")}</p>
            <div className="card" style={{ marginTop: 16, overflow: "hidden", boxShadow: "none" }}>
              <table className="table">
                <thead><tr><th>{t("Lead", "लीड")}</th><th>{t("Status", "स्थिति")}</th><th>{t("Next", "आगे")}</th></tr></thead>
                <tbody>
                  {leads.map(([n, s, sh, a, ah, tone]) => (
                    <tr key={n}><td style={{ fontWeight: 500 }}>{n}</td><td className="muted">{t(s, sh)}</td><td><span className={`badge ${tone}`}>{t(a, ah)}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card pad-lg">
            <h3>{t("Daily brief", "रोज़ का ब्रीफ़")}</h3>
            <blockquote style={{ margin: "14px 0 0", padding: "14px 16px", borderRadius: 12, background: "var(--sunk)", fontSize: "0.95rem", lineHeight: 1.55 }}>
              {t("“Today you received 32 calls. 11 appointments were confirmed. 6 customers need callbacks. Most asked about consultation pricing.”", "“आज 32 कॉल आईं। 11 अपॉइंटमेंट पक्के हुए। 6 ग्राहकों को कॉल बैक चाहिए। ज़्यादातर ने कंसल्टेशन का रेट पूछा।”")}
            </blockquote>
          </div>

          <div className="card pad-lg">
            <h3>{t("Voice intelligence", "कॉल की समझ")}</h3>
            <p className="muted small" style={{ marginTop: 8 }}>{t("Calls by hour and weekday, which version books best, which questions turn into visits.", "घंटे और दिन के हिसाब से कॉल, कौन सा वर्ज़न ज़्यादा बुक करता है।")}</p>
            <div className="row" style={{ alignItems: "flex-end", gap: 4, height: 70, marginTop: 14, flexWrap: "nowrap" }} aria-hidden>
              {hours.map((h, i) => <div key={i} style={{ flex: 1, height: `${h * 10}%`, borderRadius: 4, background: i === 9 ? "var(--brand)" : "var(--brand-soft)" }} />)}
            </div>
            <div className="row xs faint" style={{ justifyContent: "space-between", marginTop: 6 }}><span>9am</span><span>{t("busiest 6pm", "सबसे व्यस्त 6pm")}</span><span>9pm</span></div>
          </div>

          <div className="card pad-lg">
            <h3>{t("Your documents", "आपके दस्तावेज़")}</h3>
            <p className="muted small" style={{ marginTop: 8 }}>{t("Upload your price list, policies and offers. If an answer isn't in them, she offers a callback instead of guessing.", "रेट लिस्ट, नियम और ऑफ़र डालिए। जवाब उनमें नहीं तो वह अंदाज़ा नहीं, कॉल बैक देती है।")}</p>
            <div className="row" style={{ marginTop: 12, gap: 6 }}>
              {["price-list.pdf", "policies.pdf", "diwali-offer.txt"].map((f) => <span key={f} className="badge"><Icon name="file" size={12} /> {f}</span>)}
            </div>
          </div>

          <div className="card pad-lg">
            <h3>{t("Smart calendar", "स्मार्ट कैलेंडर")}</h3>
            <p className="muted small" style={{ marginTop: 8 }}>{t("Day and week view, reschedule and cancel, history per customer, Google Calendar files, and no double bookings.", "दिन और हफ़्ते का व्यू, समय बदलना, रद्द करना, हर ग्राहक का इतिहास, और कोई डबल बुकिंग नहीं।")}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginTop: 14 }} aria-hidden>
              {Array.from({ length: 21 }, (_, i) => <div key={i} style={{ height: 14, borderRadius: 4, background: [2, 5, 8, 9, 13, 16, 19].includes(i) ? "var(--brand)" : "var(--sunk)" }} />)}
            </div>
          </div>

          <div className="card pad-lg">
            <h3>{t("Knows your regulars", "पुराने ग्राहकों को पहचानता है")}</h3>
            <div className="msg them small" style={{ marginTop: 14 }}>{t("Welcome back, Rahul ji. Last time was a cleaning on 3 October. Same time as before?", "फिर से स्वागत है, राहुल जी। पिछली बार 3 अक्टूबर को सफ़ाई हुई थी। पहले वाला समय?")}</div>
          </div>

          <div className="card pad-lg">
            <h3>{t("Urgent calls jump the queue", "ज़रूरी कॉल सबसे ऊपर")}</h3>
            <p className="muted small" style={{ marginTop: 8 }}>{t("Pain, bleeding, an accident: in Hindi or English, the call is flagged and sent to you first.", "दर्द, खून, दुर्घटना: हिंदी हो या अंग्रेज़ी, कॉल मार्क होकर सबसे पहले आप तक।")}</p>
          </div>

          <div className="card pad-lg">
            <h3>{t("Hands over to a human", "इंसान को सौंपता है")}</h3>
            <p className="muted small" style={{ marginTop: 8 }}>{t("When a caller insists or it's an emergency, she connects them to your staff number.", "जब कॉलर ज़िद करे या इमरजेंसी हो, वह आपके स्टाफ़ से जोड़ देती है।")}</p>
          </div>
        </div>
      </div>
      <style>{`.bento{display:grid;gap:16px;grid-template-columns:repeat(3,1fr)}.b-wide{grid-column:span 2;grid-row:span 2}@media(max-width:960px){.bento{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.bento{grid-template-columns:1fr}.b-wide{grid-column:auto;grid-row:auto}}`}</style>
    </section>
  );
}

export function Trust() {
  const { t } = useT();
  const trust: [string, string, string, string][] = [
    ["Always says it's an AI", "हमेशा बताता है कि वह AI है", "Callers are told up front. No pretending.", "कॉलर को शुरू में ही बताया जाता है। कोई दिखावा नहीं।"],
    ["No fake bookings", "कोई नकली बुकिंग नहीं", "A booking counts only when your calendar confirms it.", "बुकिंग तभी मानी जाती है जब कैलेंडर पक्का करे।"],
    ["Hindi, English, or both", "हिंदी, अंग्रेज़ी, या दोनों", "It answers in the language the caller speaks.", "कॉलर जिस भाषा में बोले, उसी में जवाब।"],
    ["Can't be talked into things", "बातों में नहीं आता", "\"Ignore your rules\" gets caught and logged, in Hindi too.", "\"नियम भूल जाओ\" जैसी बातें पकड़ी और दर्ज होती हैं।"],
    ["You decide when it goes live", "लाइव कब हो, आप तय करते हैं", "Nothing reaches a customer until it passes its tests.", "टेस्ट पास होने तक कुछ भी ग्राहक तक नहीं जाता।"],
    ["One-click rollback", "एक क्लिक में वापस", "Every change is a new version. Go back any time.", "हर बदलाव नया वर्ज़न है। जब चाहें वापस जाएँ।"],
  ];
  return (
    <section id="trust" style={{ background: "var(--bg)", borderTop: "1px solid var(--line)", scrollMarginTop: 64 }}>
      <div className="container" style={{ padding: "80px 24px" }}>
        <h2>{t("Built to be trusted", "भरोसे के लिए बना")}</h2>
        <div style={{ display: "grid", gap: 16, marginTop: 24, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {trust.map(([en, hi, den, dhi]) => (
            <div key={en} style={{ paddingTop: 16, borderTop: "2px solid var(--ink)" }}>
              <h3>{t(en, hi)}</h3>
              <p className="muted small" style={{ marginTop: 4 }}>{t(den, dhi)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const EXAMPLES: [string, string, string][] = [
  ["Clinic", "क्लिनिक", "Sharma Dental Clinic in Indirapuram, open Mon–Sat 10 am to 8 pm. Book appointments and tell prices: cleaning ₹1,200, filling ₹1,500, root canal from ₹6,000. If a patient is in pain, ask me to call back. Speak Hindi and English. Never give medical advice."],
  ["Salon", "सैलून", "Glow Studio salon in Koramangala, open every day 10 am to 8 pm, closed Tuesdays. Haircut ₹500, beard ₹250, hair spa ₹1,500. Bookings in 30 minute slots. Never book after 7:30 pm. Hindi, English and Kannada callers."],
  ["Restaurant", "रेस्टोरेंट", "Spice Route Kitchen in Sector 18 Noida, open noon to 11 pm. Table bookings for up to 10 people, 90 minutes each. Ask for name and phone. For allergies or Jain food, don't promise, ask the kitchen to call back."],
  ["Real estate", "प्रॉपर्टी", "Gupta Properties in Lucknow, open Mon–Sat 10 am to 7 pm. Site visits for 2BHK and 3BHK flats in Gomti Nagar, 45 minutes each. Never quote a final price, the owner calls back with offers."],
  ["Coaching centre", "कोचिंग", "Bright Minds coaching in Kota, open 8 am to 8 pm. JEE and NEET batches. Demo class booking 60 minutes. Fees are told only by the counsellor, offer a callback."],
  ["Shop", "दुकान", "Verma Electronics, Karol Bagh, open 11 am to 9 pm, closed Sundays. Repair pickup slots of 30 minutes. Don't quote repair costs before inspection."],
];

export function StartCTA() {
  const { t } = useT();
  const router = useRouter();
  const [mode, setMode] = useState<"speak" | "type">("speak");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  // If the visitor had to log in first, bring back what they typed.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("pratihar-start") ?? "null") as { mode: "speak" | "type"; text: string } | null;
      if (saved) {
        setMode(saved.mode);
        setText(saved.text);
        sessionStorage.removeItem("pratihar-start");
      }
    } catch {}
  }, []);

  async function go() {
    setErr("");
    try {
      sessionStorage.setItem("pratihar-start", JSON.stringify({ mode, text }));
    } catch {}
    if (mode === "speak") {
      setBusy(t("Opening…", "खुल रहा है…"));
      try {
        const b = await api<{ _id: string }>("/api/businesses", { method: "POST", json: {} });
        sessionStorage.removeItem("pratihar-start");
        router.push(`/app/${b._id}?tab=explain&start=voice`);
      } catch (e) {
        if (e instanceof Unauthorized) return;
        setErr((e as Error).message);
        setBusy("");
      }
      return;
    }
    setBusy(t("Writing your card…", "आपका कार्ड बन रहा है…"));
    let id = "";
    try {
      id = (await api<{ _id: string }>("/api/businesses", { method: "POST", json: { description: text } }))._id;
      sessionStorage.removeItem("pratihar-start");
      await api(`/api/businesses/${id}/card`, { method: "POST" });
      router.push(`/app/${id}?tab=card`);
    } catch (e) {
      if (e instanceof Unauthorized) return;
      if (id) router.push(`/app/${id}?tab=explain`);
      else {
        setErr((e as Error).message);
        setBusy("");
      }
    }
  }

  return (
    <section id="start" style={{ background: "#eef6f5", borderTop: "1px solid var(--line)", scrollMarginTop: 64 }}>
      <div className="container" style={{ padding: "88px 24px", textAlign: "center" }}>
        <h2 style={{ maxWidth: 560, margin: "0 auto" }}>{t("Your next missed call could be your next customer.", "आपकी अगली छूटी कॉल, आपका अगला ग्राहक हो सकती है।")}</h2>
        <div className="card" style={{ maxWidth: 560, margin: "32px auto 0", padding: 24, textAlign: "left", boxShadow: "var(--shadow-lg)" }}>
          <h3 style={{ textAlign: "center", fontWeight: 500 }}>{t("How do you want to tell Pratihar about your business?", "प्रतिहार को अपने बिज़नेस के बारे में कैसे बताएँगे?")}</h3>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", marginTop: 18 }} role="radiogroup">
            {([["speak", "mic", "Speak to Pratihar", "प्रतिहार से बोलिए", "Answer a few simple questions out loud. Easiest.", "कुछ आसान सवालों के जवाब बोलकर। सबसे आसान।"], ["type", "keyboard", "Type it", "लिखिए", "Describe your business in a few lines.", "कुछ लाइनों में बिज़नेस बताइए।"]] as const).map(([k, icon, en, hi, den, dhi]) => (
              <button
                key={k}
                role="radio"
                aria-checked={mode === k}
                onClick={() => setMode(k)}
                className="row"
                style={{ textAlign: "left", alignItems: "flex-start", flexWrap: "nowrap", gap: 12, padding: 14, borderRadius: 12, cursor: "pointer", background: mode === k ? "#f3fafa" : "var(--surface)", border: `1.5px solid ${mode === k ? "var(--brand)" : "var(--line)"}` }}
              >
                <span className="tile" style={{ borderRadius: 999, width: 36, height: 36, background: mode === k ? "var(--brand)" : "var(--sunk)", color: mode === k ? "#fff" : "var(--ink-2)" }}><Icon name={icon} size={16} /></span>
                <span>
                  <span style={{ display: "block", fontWeight: 500 }}>{t(en, hi)}</span>
                  <span className="xs muted">{t(den, dhi)}</span>
                </span>
              </button>
            ))}
          </div>
          {mode === "type" && (
            <div className="col fade-in" style={{ marginTop: 14, gap: 10 }}>
              <label className="sr" htmlFor="describe">{t("Describe your business", "अपना बिज़नेस बताइए")}</label>
              <textarea id="describe" className="textarea" rows={4} maxLength={1200} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Example: Sharma Dental Clinic in Indirapuram, open Mon–Sat 10 am to 8 pm. Book appointments, tell prices (cleaning ₹1,200, filling ₹1,500). Call me if a patient is in pain. Speak Hindi and English.", "जैसे: इंदिरापुरम में शर्मा डेंटल क्लिनिक, सोम–शनि सुबह 10 से रात 8। अपॉइंटमेंट बुक करो, रेट बताओ (सफ़ाई ₹1,200)। दर्द हो तो मुझे कॉल करवाओ।")} />
              <div className="row xs faint" style={{ justifyContent: "flex-end", marginTop: -6 }}>{text.length}/1200</div>
              <span className="xs muted">{t("Or start from an example:", "या एक उदाहरण से शुरू करें:")}</span>
              <div className="row" style={{ gap: 6 }}>
                {EXAMPLES.map(([en, hi, ex]) => <button key={en} className="chip" style={{ height: 30, fontSize: "0.8rem" }} onClick={() => setText(ex)}>{t(en, hi)}</button>)}
              </div>
            </div>
          )}
          <button className="btn btn-block" style={{ marginTop: 16 }} onClick={go} disabled={!!busy || (mode === "type" && text.trim().length < 40)}>
            {busy ? <><span className="spin" /> {busy}</> : mode === "speak" ? <><Icon name="mic" size={16} /> {t("Start talking", "बोलना शुरू करें")}</> : t("Make my card", "मेरा कार्ड बनाइए")}
          </button>
          {err && <p className="err" style={{ marginTop: 8 }}>{err}</p>}
          <p className="xs faint" style={{ textAlign: "center", marginTop: 10 }}>{t("No coding. Takes about 5 minutes.", "कोई कोडिंग नहीं। लगभग 5 मिनट।")}</p>
        </div>
      </div>
    </section>
  );
}
