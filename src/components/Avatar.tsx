// Flat illustrated profile pictures, drawn here so they match the palette and carry no stock licence.
type Hair = "long" | "bun" | "bob" | "braid" | "short" | "curly" | "turban" | "side";
type Look = { bg: string; skin: string; hair: string; hairStyle: Hair; outfit: string; beard?: boolean; glasses?: boolean; label: string };

export const AVATARS: Record<string, Look> = {
  f1: { label: "Long hair", bg: "#e46b6b", skin: "#e8a787", hair: "#4a2c22", hairStyle: "long", outfit: "#e7d9c4" },
  f2: { label: "Hair bun", bg: "#e9b44c", skin: "#c98a65", hair: "#1f1a1a", hairStyle: "bun", outfit: "#0d7377" },
  f3: { label: "Short bob", bg: "#b8b3e6", skin: "#d9a07c", hair: "#2b1e1a", hairStyle: "bob", outfit: "#ffffff" },
  f4: { label: "Plait", bg: "#f2c4a8", skin: "#9c6447", hair: "#161212", hairStyle: "braid", outfit: "#c2513a" },
  m1: { label: "Short hair", bg: "#5b8f74", skin: "#d39b78", hair: "#1d1717", hairStyle: "short", outfit: "#ffffff" },
  m2: { label: "Beard", bg: "#d9c49a", skin: "#b9805e", hair: "#231a17", hairStyle: "side", outfit: "#f2efe8", beard: true },
  m3: { label: "Turban", bg: "#f6e2b3", skin: "#c58a64", hair: "#2a201c", hairStyle: "turban", outfit: "#0d7377", beard: true },
  m4: { label: "Curly hair, glasses", bg: "#f0a875", skin: "#e2b08f", hair: "#3a2a22", hairStyle: "curly", outfit: "#4d5b6b", glasses: true },
};
export type AvatarId = keyof typeof AVATARS;
export const AVATAR_IDS = Object.keys(AVATARS) as AvatarId[];

const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.max(0, Math.min(255, ((n >> s) & 255) + amt));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
};

export function Avatar({ id, size = 36, name }: { id?: string | null; size?: number; name?: string }) {
  const a = id ? AVATARS[id] : undefined;
  if (!a) {
    const initials = (name ?? "?").split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
    return (
      <span aria-hidden style={{ width: size, height: size, borderRadius: 999, display: "grid", placeItems: "center", background: "var(--brand-soft)", color: "var(--brand-2)", fontWeight: 600, fontSize: size * 0.36, flex: "none" }}>
        {initials || "?"}
      </span>
    );
  }
  const clip = `av-${id}-${size}`;
  const dark = shade(a.skin, -28);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ flex: "none", display: "block" }}>
      <defs>
        <clipPath id={clip}><circle cx="32" cy="32" r="32" /></clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="64" height="64" fill={a.bg} />
        {/* hair that falls behind the shoulders */}
        {a.hairStyle === "long" && <path d="M19 28c0-13 26-13 26 0l3 26H16z" fill={a.hair} />}
        {a.hairStyle === "bob" && <path d="M19.5 29c0-13 25-13 25 0v11c-3 2-22 2-25 0z" fill={a.hair} />}
        {a.hairStyle === "braid" && (
          <g fill={a.hair}>
            <path d="M20.5 29c0-12 23-12 23 0v6h-23z" />
            {[40, 45, 50, 55].map((y) => <ellipse key={y} cx="42" cy={y} rx="3" ry="3.4" />)}
          </g>
        )}
        {/* shoulders and collar */}
        <path d="M8 66c2-14 12-20 24-20s22 6 24 20z" fill={a.outfit} />
        <path d="M26.5 46.5 32 55l5.5-8.5" fill="none" stroke={shade(a.outfit, -40)} strokeWidth="1.6" strokeLinejoin="round" />
        <rect x="28" y="38" width="8" height="10" rx="3" fill={dark} />
        {/* head */}
        <circle cx="21.8" cy="31" r="2.4" fill={dark} />
        <circle cx="42.2" cy="31" r="2.4" fill={dark} />
        <ellipse cx="32" cy="30" rx="10" ry="11.5" fill={a.skin} />
        {/* hair on top */}
        {a.hairStyle === "long" && <path d="M20.6 31C18.6 12 45.4 12 43.4 31c-2.4-6-6.4-9-11.4-9s-9 3-11.4 9z" fill={a.hair} />}
        {a.hairStyle === "bob" && <path d="M20.4 30C18.6 12 45.4 12 43.6 30c-4-5.6-8-7.6-11.6-7.6S24.4 24.4 20.4 30z" fill={a.hair} />}
        {a.hairStyle === "braid" && <path d="M21 30C19 13 45 13 43 30c-3.4-5.4-7-7.4-11-7.4s-7.6 2-11 7.4z" fill={a.hair} />}
        {a.hairStyle === "bun" && (
          <g fill={a.hair}>
            <circle cx="32" cy="13" r="5.4" />
            <path d="M21 30C19 13 45 13 43 30c-3.4-5.4-7-7.4-11-7.4s-7.6 2-11 7.4z" />
          </g>
        )}
        {a.hairStyle === "short" && <path d="M21.2 28C19.6 12.5 44.4 12.5 42.8 28c-2.6-4.2-6.4-6-10.8-6s-8.2 1.8-10.8 6z" fill={a.hair} />}
        {a.hairStyle === "side" && <path d="M21.2 28.5C19.6 12.5 44.4 12.5 42.8 28.5c-1.6-3.2-3.6-5-6.4-6-5.2 2.8-10.4 3.6-15.2 6z" fill={a.hair} />}
        {a.hairStyle === "curly" && (
          <g fill={a.hair}>
            {[[23, 24], [26.5, 20], [31, 18.5], [35.5, 19.5], [39.5, 22.5], [41.5, 26.5], [22, 27.5]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="4" />)}
          </g>
        )}
        {a.hairStyle === "turban" && (
          <g>
            <path d="M20 29C17.6 9.5 46.4 9.5 44 29c-3.6-3.8-8.4-5.2-12-5.2s-8.4 1.4-12 5.2z" fill="#e8833a" />
            <path d="M23.4 18.6c4.4-3 12-3.4 17.4 1.6M21.6 23.6c5.4-4.4 15.4-4.8 20.8.4" fill="none" stroke="#b9770f" strokeWidth="1.3" strokeLinecap="round" />
          </g>
        )}
        {a.beard && <path d="M22.6 32.5c.6 9.4 5 12.6 9.4 12.6s8.8-3.2 9.4-12.6c-2 3.8-5 5.4-9.4 5.4s-7.4-1.6-9.4-5.4z" fill={a.hair} />}
        {/* face */}
        <circle cx="28" cy="30.5" r="1.15" fill="#1b2430" />
        <circle cx="36" cy="30.5" r="1.15" fill="#1b2430" />
        <path d="M28.8 26.8h2.4M32.8 26.8h2.4" stroke={a.hair} strokeWidth="1.1" strokeLinecap="round" />
        <path d={a.beard ? "M29.4 36.2q2.6 1.8 5.2 0" : "M29 35.6q3 2.6 6 0"} fill="none" stroke={a.beard ? "#f3e6dc" : "#7a3b2e"} strokeWidth="1.2" strokeLinecap="round" />
        {a.glasses && (
          <g fill="none" stroke="#1b2430" strokeWidth="1.1">
            <circle cx="28" cy="30.6" r="2.9" />
            <circle cx="36" cy="30.6" r="2.9" />
            <path d="M30.9 30.4h2.2" />
          </g>
        )}
      </g>
    </svg>
  );
}

export function AvatarPicker({ value, onChange, label }: { value: string | null; onChange: (id: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
      {AVATAR_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          aria-label={AVATARS[id].label}
          onClick={() => onChange(id)}
          style={{ padding: 3, borderRadius: 999, border: `2px solid ${value === id ? "var(--brand)" : "transparent"}`, background: "none", cursor: "pointer", justifySelf: "center", transition: "border-color .15s, transform .15s", transform: value === id ? "scale(1.06)" : "none" }}
        >
          <Avatar id={id} size={52} />
        </button>
      ))}
    </div>
  );
}
