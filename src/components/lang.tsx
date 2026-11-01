"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Lang = "en" | "hi";
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pratihar-lang");
      if (saved === "hi" || saved === "en") setLangState(saved);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("pratihar-lang", l);
    } catch {}
  };
  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

/** Copy lives next to the UI that uses it: t("Book", "बुक करें"). */
export function useT() {
  const { lang, setLang } = useContext(Ctx);
  const t = (en: string, hi: string) => (lang === "hi" ? hi : en);
  return { t, lang, setLang };
}

export function LangToggle() {
  const { lang, setLang } = useT();
  return (
    <div role="group" aria-label="Language" style={{ display: "inline-flex", padding: 3, borderRadius: 999, border: "1px solid var(--line-2)", background: "var(--surface)" }}>
      {(["en", "hi"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          style={{
            border: 0,
            cursor: "pointer",
            height: 30,
            padding: "0 14px",
            borderRadius: 999,
            fontSize: "0.88rem",
            background: lang === l ? "var(--ink)" : "transparent",
            color: lang === l ? "#fff" : "var(--ink-2)",
            transition: "background-color .15s",
          }}
        >
          {l === "en" ? "English" : "हिंदी"}
        </button>
      ))}
    </div>
  );
}
