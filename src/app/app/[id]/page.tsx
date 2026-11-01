"use client";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AccountMenu, useMe } from "@/components/Account";
import { api, Unauthorized } from "@/components/fetcher";
import { Icon } from "@/components/Icon";
import { LangToggle, useT } from "@/components/lang";
import { Mark } from "@/components/Logo";
import type { DeskData } from "@/components/desk/types";
import Overview, { progress, STEPS } from "@/components/desk/Overview";
import Explain from "@/components/desk/Explain";
import CardTab from "@/components/desk/CardTab";
import Practice from "@/components/desk/Practice";
import Fix from "@/components/desk/Fix";
import GoLive from "@/components/desk/GoLive";
import Calls from "@/components/desk/Calls";
import Calendar from "@/components/desk/Calendar";
import Insights from "@/components/desk/Insights";
import Knowledge from "@/components/desk/Knowledge";
import Security from "@/components/desk/Security";

const VIEWS = { explain: Explain, card: CardTab, practice: Practice, fix: Fix, golive: GoLive, calls: Calls, calendar: Calendar, insights: Insights, knowledge: Knowledge, security: Security };

// Short pill names, the way the reference labels its steps.
const PILL: Record<string, [string, string]> = {
  explain: ["Explain", "बताइए"],
  card: ["Check card", "कार्ड देखें"],
  practice: ["Practice", "प्रैक्टिस"],
  fix: ["Fix", "सुधार"],
  golive: ["Go live", "लाइव"],
};
const AFTER: [string, string, string][] = [
  ["calls", "Calls", "कॉल"],
  ["calendar", "Appointments", "अपॉइंटमेंट"],
];

function Desk() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const { t } = useT();
  const [me, setMe] = useMe();
  const [data, setData] = useState<DeskData | null>(null);
  const [err, setErr] = useState("");
  const tab = sp.get("tab") ?? "overview";

  const reload = useCallback(async () => {
    try {
      setData(await api<DeskData>(`/api/businesses/${id}`));
    } catch (e) {
      if (!(e instanceof Unauthorized)) setErr((e as Error).message);
    }
  }, [id]);
  useEffect(() => {
    void reload();
  }, [reload]);

  const go = (to: string) => {
    router.push(to === "overview" ? `/app/${id}` : `/app/${id}?tab=${to}`, { scroll: false });
    window.scrollTo({ top: 0 });
  };

  if (err)
    return (
      <main className="container" style={{ padding: "96px 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.8rem" }}>{t("We couldn't open this business", "यह बिज़नेस नहीं खुल सका")}</h1>
        <p className="muted" style={{ marginTop: 8 }}>{err}</p>
        <Link href="/app" className="btn" style={{ marginTop: 20 }}>{t("Back to my businesses", "मेरे बिज़नेस पर वापस")}</Link>
      </main>
    );

  const View = tab in VIEWS ? VIEWS[tab as keyof typeof VIEWS] : null;
  const stepIndex = STEPS.findIndex((s) => s.id === tab);
  const p = data ? progress(data) : null;

  return (
    <>
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(251,248,243,.92)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", borderBottom: "1px solid var(--line)" }}>
        <div className="container row" style={{ height: 60, flexWrap: "nowrap" }}>
          <Link href="/app" className="row" style={{ textDecoration: "none", gap: 10, flexWrap: "nowrap", minWidth: 0 }} title={t("My businesses", "मेरे बिज़नेस")}>
            <Mark size={28} />
            <span className="hide-xs" style={{ fontSize: "1.2rem" }}>Pratihar</span>
          </Link>
          <span style={{ width: 1, height: 28, background: "var(--line)", margin: "0 6px", flex: "none" }} />
          <div style={{ minWidth: 0, lineHeight: 1.25 }}>
            <div className="xs faint">{t("Receptionist for", "रिसेप्शनिस्ट")}</div>
            <div style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{data?.business.name ?? "…"}</div>
          </div>
          <span className="grow" />
          <LangToggle />
          <AccountMenu me={me} onChange={setMe} />
        </div>
        <nav className="container pills" aria-label={t("Steps", "कदम")}>
          <button className="pill" data-on={!View} onClick={() => go("overview")} aria-current={!View ? "page" : undefined}>
            <Icon name="store" size={15} /> {t("Home", "होम")}
          </button>
          {STEPS.map((s, i) => {
            const on = tab === s.id;
            const done = !!p?.done[s.id];
            return (
              <button key={s.id} className="pill" data-on={on} onClick={() => go(s.id)} aria-current={on ? "step" : undefined}>
                <span className="num" data-done={done && !on}>{done && !on ? <Icon name="check" size={12} /> : i + 1}</span>
                {t(PILL[s.id][0], PILL[s.id][1])}
              </button>
            );
          })}
          {AFTER.map(([k, en, hi]) => (
            <button key={k} className="pill" data-on={tab === k} onClick={() => go(k)} aria-current={tab === k ? "page" : undefined}>
              {t(en, hi)}
            </button>
          ))}
        </nav>
      </header>

      <main className="container" style={{ padding: "32px 24px 80px" }}>
        {!data ? (
          <div className="col" style={{ gap: 16 }}>
            <div className="skeleton" style={{ height: 40, width: 260 }} />
            <div className="skeleton" style={{ height: 18, width: 420, maxWidth: "100%" }} />
            <div className="skeleton" style={{ height: 320 }} />
          </div>
        ) : View ? (
          <>
            <View data={data} reload={reload} go={go} />
            {stepIndex >= 0 && (
              <div className="row step-nav">
                {stepIndex > 0 ? (
                  <button className="btn btn-outline" onClick={() => go(STEPS[stepIndex - 1].id)}>
                    <Icon name="back" size={16} /> {t(PILL[STEPS[stepIndex - 1].id][0], PILL[STEPS[stepIndex - 1].id][1])}
                  </button>
                ) : <span />}
                {stepIndex < STEPS.length - 1 ? (
                  <button className={`btn ${p?.done[STEPS[stepIndex].id] ? "" : "btn-outline"}`} onClick={() => go(STEPS[stepIndex + 1].id)}>
                    {t("Next", "अगला")}: {t(PILL[STEPS[stepIndex + 1].id][0], PILL[STEPS[stepIndex + 1].id][1])} <Icon name="arrow" size={16} />
                  </button>
                ) : (
                  <button className="btn btn-outline" onClick={() => go("overview")}>{t("Back to Home", "होम पर वापस")}</button>
                )}
              </div>
            )}
          </>
        ) : (
          <Overview data={data} reload={reload} go={go} me={me} />
        )}
      </main>

      <style>{`
        .pills{display:flex;gap:4px;overflow-x:auto;padding-bottom:10px;scrollbar-width:none}
        .pills::-webkit-scrollbar{display:none}
        .pill{appearance:none;border:0;background:transparent;height:34px;padding:0 12px 0 8px;border-radius:999px;font-size:.9rem;color:var(--ink-2);cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:8px;transition:background-color .15s,color .15s}
        .pill:hover{background:var(--sunk);color:var(--ink)}
        .pill[data-on=true]{background:var(--ink);color:#fff}
        .pill:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
        .num{width:22px;height:22px;border-radius:99px;display:grid;place-items:center;font-size:.75rem;border:1px solid var(--line-2);color:var(--ink-3);background:var(--surface)}
        .pill[data-on=true] .num{background:#fff;color:var(--ink);border-color:#fff}
        .num[data-done=true]{background:var(--brand);border-color:var(--brand);color:#fff}
        .step-nav{justify-content:space-between;margin-top:32px;padding-top:20px;border-top:1px solid var(--line);gap:12px}
        @media(max-width:560px){.hide-xs{display:none!important}}
      `}</style>
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Desk />
    </Suspense>
  );
}
