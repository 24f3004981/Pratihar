"use client";
import { Icon, type IconName } from "../Icon";

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, gap: 16 }}>
      <div style={{ maxWidth: 680 }}>
        <h1 style={{ fontSize: "clamp(1.9rem, 4vw, 2.5rem)" }}>{title}</h1>
        {sub && <p className="muted" style={{ marginTop: 8 }}>{sub}</p>}
      </div>
      {children && <div className="row" style={{ gap: 8 }}>{children}</div>}
    </div>
  );
}

export function Empty({ icon, title, sub, children }: { icon: IconName; title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: "48px 24px", textAlign: "center", display: "grid", justifyItems: "center", gap: 10 }}>
      <span className="tile" style={{ width: 48, height: 48, borderRadius: 14 }}><Icon name={icon} size={22} /></span>
      <h3>{title}</h3>
      {sub && <p className="muted small" style={{ maxWidth: 420 }}>{sub}</p>}
      {children && <div style={{ marginTop: 8 }}>{children}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: "pass" | "fail" | "wait" }) {
  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      <div className="xs faint">{label}</div>
      <div style={{ fontSize: "1.65rem", marginTop: 2, color: tone ? `var(--${tone})` : undefined }}>{value}</div>
      {sub && <div className="xs faint">{sub}</div>}
    </div>
  );
}

export function FormRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="formrow">
      <div className="small" style={{ color: "var(--ink-2)", paddingTop: 10 }}>{label}</div>
      <div>
        {children}
        {hint && <div className="hint" style={{ marginTop: 6 }}>{hint}</div>}
      </div>
      <style>{`.formrow{display:grid;grid-template-columns:150px 1fr;gap:16px;padding:16px 20px;border-bottom:1px solid var(--line)}.formrow:last-child{border-bottom:0}@media(max-width:620px){.formrow{grid-template-columns:1fr;gap:6px}.formrow>div:first-child{padding-top:0}}`}</style>
    </div>
  );
}

export function Panel({ title, action, children, pad = true }: { title?: string; action?: React.ReactNode; children: React.ReactNode; pad?: boolean }) {
  return (
    <section className="card" style={{ overflow: "hidden" }}>
      {title && (
        <div className="row" style={{ padding: "14px 20px", borderBottom: "1px solid var(--line)", justifyContent: "space-between" }}>
          <h3>{title}</h3>
          {action}
        </div>
      )}
      <div style={pad ? { padding: 20 } : undefined}>{children}</div>
    </section>
  );
}
