"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AvatarPicker } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { LangToggle, useT } from "@/components/lang";
import { Logo } from "@/components/Logo";

// Only follow same-site paths after login; "//evil.com" and full URLs are ignored.
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/app");

function LoginForm() {
  const { t } = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const next = safeNext(sp.get("next"));
  const [mode, setMode] = useState<"login" | "signup">(sp.get("mode") === "signup" ? "signup" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((u) => u && router.replace(next)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    setErr("");
    first.current?.focus();
  }, [mode]);

  const signup = mode === "signup";
  const ready = email.includes("@") && password.length >= (signup ? 8 : 1) && (!signup || name.trim().length >= 2);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(signup ? { name, email, password, ...(avatar ? { avatar } : {}) } : { email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t("Something went wrong. Try again.", "कुछ गड़बड़ हुई। फिर कोशिश करें।"));
      router.replace(next);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ width: "100%", maxWidth: 400, padding: "28px 28px 24px" }}>
      <h1 style={{ fontSize: "1.6rem", textAlign: "center" }}>{signup ? t("Create your account", "अपना अकाउंट बनाइए") : t("Log in to Pratihar", "प्रतिहार में लॉग इन करें")}</h1>
      <p className="muted small" style={{ textAlign: "center", marginTop: 6 }}>
        {signup ? t("Takes a minute. Free while you try it.", "एक मिनट लगेगा। आज़माने के लिए मुफ़्त।") : t("Welcome back.", "फिर से स्वागत है।")}
      </p>

      <form onSubmit={submit} className="col" style={{ gap: 14, marginTop: 22 }} noValidate>
        {signup && (
          <>
            <div className="field">
              <span className="label">{t("Pick a picture", "एक तस्वीर चुनिए")} <span className="faint" style={{ fontWeight: 400 }}>· {t("optional", "वैकल्पिक")}</span></span>
              <AvatarPicker value={avatar} onChange={setAvatar} label={t("Profile picture", "प्रोफ़ाइल तस्वीर")} />
            </div>
            <label className="field">
              <span className="label">{t("Your name", "आपका नाम")}</span>
              <input ref={first} className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Neha Sharma" />
            </label>
          </>
        )}
        <label className="field">
          <span className="label">{t("Email", "ईमेल")}</span>
          <input ref={signup ? undefined : first} className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder="you@business.in" />
        </label>
        <label className="field">
          <span className="label">{t("Password", "पासवर्ड")}</span>
          <span style={{ position: "relative", display: "block" }}>
            <input className="input" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={signup ? "new-password" : "current-password"} style={{ paddingRight: 64 }} aria-describedby={signup ? "pw-hint" : undefined} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? t("Hide password", "पासवर्ड छुपाएँ") : t("Show password", "पासवर्ड दिखाएँ")} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", border: 0, background: "none", color: "var(--brand)", cursor: "pointer", fontSize: "0.82rem", padding: "6px 8px" }}>
              {show ? t("Hide", "छुपाएँ") : t("Show", "दिखाएँ")}
            </button>
          </span>
          {signup && <span id="pw-hint" className="hint" style={{ color: password && password.length < 8 ? "var(--fail)" : undefined }}>{t("At least 8 characters.", "कम से कम 8 अक्षर।")}</span>}
        </label>

        {err && (
          <div role="alert" className="row small" style={{ gap: 8, padding: "10px 12px", borderRadius: 10, background: "var(--fail-soft)", color: "var(--fail)", flexWrap: "nowrap" }}>
            <Icon name="alert" size={15} /> {err}
          </div>
        )}

        <button className="btn btn-block" disabled={busy || !ready} style={{ marginTop: 4 }}>
          {busy && <span className="spin" />}
          {signup ? t("Create account", "अकाउंट बनाइए") : t("Log in", "लॉग इन")}
        </button>
      </form>

      <hr className="divider" style={{ margin: "20px 0 16px" }} />
      <p className="small muted" style={{ textAlign: "center" }}>
        {signup ? t("Already have an account?", "पहले से अकाउंट है?") : t("New here?", "नए हैं?")}{" "}
        <button onClick={() => setMode(signup ? "login" : "signup")} style={{ border: 0, background: "none", color: "var(--brand)", cursor: "pointer", padding: 0, font: "inherit", fontWeight: 500 }}>
          {signup ? t("Log in", "लॉग इन") : t("Create an account", "अकाउंट बनाइए")}
        </button>
      </p>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useT();
  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 16px", gap: 28 }}>
      <Logo />
      <Suspense fallback={<span className="spin" style={{ marginTop: 40 }} />}>
        <LoginForm />
      </Suspense>
      <div className="col" style={{ alignItems: "center", gap: 12, marginTop: "auto" }}>
        <LangToggle />
        <p className="xs faint" style={{ textAlign: "center", maxWidth: 340 }}>
          {t("Your callers' details stay with your business. We never sell or share them.", "आपके कॉलर की जानकारी आपके बिज़नेस के पास रहती है। हम इसे कभी बेचते या बाँटते नहीं।")}
        </p>
      </div>
    </main>
  );
}
