"use client";
import Link from "next/link";
import { AccountMenu, useMe } from "./Account";
import { LangToggle, useT } from "./lang";
import { Logo } from "./Logo";

export function SiteHeader({ cta = true }: { cta?: boolean }) {
  const { t } = useT();
  const [me, setMe] = useMe();
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "rgba(251, 248, 243, 0.85)",
        backdropFilter: "saturate(1.4) blur(10px)",
        WebkitBackdropFilter: "saturate(1.4) blur(10px)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div className="container row" style={{ height: 64, flexWrap: "nowrap" }}>
        <Logo />
        <nav className="row hide-sm" style={{ gap: 4, marginLeft: 24 }} aria-label={t("Main", "मुख्य")}>
          <a href="/#how" className="btn btn-ghost btn-sm">{t("How it works", "कैसे काम करता है")}</a>
          <a href="/#after" className="btn btn-ghost btn-sm">{t("After the call", "कॉल के बाद")}</a>
          <Link href="/app" className="btn btn-ghost btn-sm">{t("My businesses", "मेरे बिज़नेस")}</Link>
        </nav>
        <span className="grow" />
        <LangToggle />
        <AccountMenu me={me} onChange={setMe} />
        {cta && !me && (
          <Link href="/login?mode=signup&next=%2F%23start" className="btn btn-sm hide-xs">
            {t("Start free", "मुफ़्त शुरू करें")}
          </Link>
        )}
      </div>
      <style>{`@media (max-width: 860px){.hide-sm{display:none!important}}@media (max-width: 480px){.hide-xs{display:none!important}}`}</style>
    </header>
  );
}
