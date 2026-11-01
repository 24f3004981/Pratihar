import Link from "next/link";

export function Mark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M16 3C8.8 3 3 8.4 3 15c0 2.6.9 5 2.4 7L4 28.5l6.8-2.3c1.6.6 3.4.8 5.2.8 7.2 0 13-5.4 13-12S23.2 3 16 3z" fill="var(--brand)" />
      <rect x="11" y="10" width="2.6" height="11" rx="1.3" fill="#fff" />
      <path d="M13.6 10.2h3.2a3.6 3.6 0 0 1 0 7.2h-3.2" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="22" cy="20" r="2" fill="var(--gold)" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="row" style={{ textDecoration: "none", gap: 10 }} aria-label="Pratihar home">
      <Mark />
      <span style={{ fontSize: "1.35rem", letterSpacing: "-0.01em" }}>Pratihar</span>
    </Link>
  );
}
