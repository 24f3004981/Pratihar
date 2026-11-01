"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarPicker } from "./Avatar";
import { logout } from "./fetcher";
import { Icon } from "./Icon";
import { useT } from "./lang";

export type Me = { name: string; email: string; avatar: string | null } | null;

export function useMe() {
  const [me, setMe] = useState<Me | undefined>(undefined);
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json()).then(setMe).catch(() => setMe(null));
  }, []);
  return [me, setMe] as const;
}

/** Signed out: a "Log in" link. Signed in: the owner's picture, which opens a small menu. */
export function AccountMenu({ me, onChange }: { me: Me | undefined; onChange?: (m: Me) => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return setPicking(false);
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (me === undefined) return <span style={{ width: 38 }} />;
  if (!me) return <Link href="/login" className="btn btn-ghost btn-sm">{t("Log in", "लॉग इन")}</Link>;

  async function pick(avatar: string) {
    setSaving(true);
    const res = await fetch("/api/auth/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ avatar }) });
    if (res.ok) onChange?.(await res.json());
    setSaving(false);
    setPicking(false);
  }

  return (
    <div ref={box} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("Your account", "आपका अकाउंट")}
        style={{ padding: 2, borderRadius: 999, border: `2px solid ${open ? "var(--brand)" : "transparent"}`, background: "none", cursor: "pointer", display: "grid" }}
      >
        <Avatar id={me.avatar} name={me.name} size={34} />
      </button>
      {open && (
        <div role="menu" className="card fade-in" style={{ position: "absolute", right: 0, top: 46, width: picking ? 300 : 250, padding: 6, boxShadow: "var(--shadow-lg)", zIndex: 60 }}>
          <div className="row" style={{ padding: "10px 10px 12px", borderBottom: "1px solid var(--line)", marginBottom: 4, gap: 10, flexWrap: "nowrap" }}>
            <Avatar id={me.avatar} name={me.name} size={40} />
            <div style={{ minWidth: 0 }}>
              <div className="small" style={{ fontWeight: 500 }}>{me.name}</div>
              <div className="xs faint" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{me.email}</div>
            </div>
          </div>
          {picking ? (
            <div style={{ padding: "8px 6px 10px" }}>
              <div className="xs muted" style={{ marginBottom: 10 }}>{saving ? t("Saving…", "सेव हो रहा है…") : t("Choose your picture", "अपनी तस्वीर चुनिए")}</div>
              <AvatarPicker value={me.avatar} onChange={pick} label={t("Profile picture", "प्रोफ़ाइल तस्वीर")} />
            </div>
          ) : (
            <>
              <button role="menuitem" className="menu-item" onClick={() => setPicking(true)}><Icon name="userCheck" size={15} /> {t("Change picture", "तस्वीर बदलें")}</button>
              <Link role="menuitem" href="/app" className="menu-item" onClick={() => setOpen(false)}><Icon name="store" size={15} /> {t("My businesses", "मेरे बिज़नेस")}</Link>
              <button role="menuitem" className="menu-item" onClick={logout}><Icon name="back" size={15} /> {t("Log out", "लॉग आउट")}</button>
            </>
          )}
          <style>{`.menu-item{display:flex;align-items:center;gap:10px;width:100%;padding:10px;border-radius:8px;border:0;background:none;font-size:.92rem;color:var(--ink);text-decoration:none;cursor:pointer;text-align:left}.menu-item:hover{background:var(--sunk)}`}</style>
        </div>
      )}
    </div>
  );
}
