/** "10", "9.30", "2pm", "10:00" -> minutes after midnight. null if it isn't a time. */
function minutes(raw: string): { m: number; ampm: boolean } | null {
  const x = /^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/i.exec(raw.trim());
  if (!x) return null;
  let h = Number(x[1]);
  const min = Number(x[2] ?? 0);
  if (x[3]) h = (h % 12) + (x[3].toLowerCase() === "pm" ? 12 : 0);
  return h > 23 || min > 59 ? null : { m: h * 60 + min, ampm: !!x[3] };
}
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Forgiving parser for what owners actually type: "10-2, 5-8pm" means 10:00–14:00 and 17:00–20:00. */
export function fromText(s: string): { open: string; close: string }[] | null {
  const out: { open: string; close: string }[] = [];
  for (const part of s.split(",").map((p) => p.trim()).filter(Boolean)) {
    const [a, b] = part.split(/\s*(?:-|–|to)\s*/i);
    const o = minutes(a ?? "");
    const c = minutes(b ?? "");
    if (!o || !c) return null;
    let open = o.m;
    let close = c.m;
    // "10-2" or "5-8" with no am/pm: an afternoon end, and an evening range if both are small
    if (!c.ampm && close <= open && close < 12 * 60) close += 12 * 60;
    if (!o.ampm && !c.ampm && open < 7 * 60 && close < 12 * 60) {
      open += 12 * 60;
      close += 12 * 60;
    }
    // "5-8pm": the pm carries back to the start, otherwise it would read as a 15-hour shift from 5 am
    if (!o.ampm && c.ampm && open < 12 * 60 && open + 12 * 60 < close) open += 12 * 60;
    if (close <= open) return null;
    out.push({ open: hhmm(open), close: hhmm(close) });
  }
  return out;
}
