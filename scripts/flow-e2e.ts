// Full owner + caller flow against the running app: `npx tsx scripts/flow-e2e.ts [baseUrl]`
// Sign up -> interview in English and Hindi -> card saved -> share link -> a stranger calls it
// (no login) -> hang up -> call shows in Calls and in TigerData-backed Reports.
export {};
type Draft = { interview: { text: string }[]; done: boolean; draft: { businessName?: string; services?: unknown[] } | null; version: number | null };
const BASE = process.argv[2] ?? "http://localhost:3000";
let cookie = "";

async function j<T = Record<string, unknown>>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}) {
  const res = await fetch(BASE + path, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { "content-type": "application/json", ...(init.auth === false ? {} : { cookie }) },
    body: init.body ? JSON.stringify(init.body) : undefined,
    redirect: "manual",
  });
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok && res.status !== 307) throw new Error(`${path} -> ${res.status} ${data.error ?? ""}`);
  return { status: res.status, data, location: res.headers.get("location") };
}
const step = (s: string) => console.log(`\n== ${s}`);
const t0 = () => Date.now();

async function main() {
  step("sign up");
  await j("/api/auth/signup", { body: { name: "Flow Tester", email: `flow-${Date.now()}@test.local`, password: "localtest-123", avatar: "f2" } });
  const biz = (await j<{ _id: string }>("/api/businesses", { body: { name: "Flow Test Dental" } })).data;
  console.log("business", biz._id);

  step("interview in English");
  let t = t0();
  let r = (await j<{ interview: { text: string }[] }>(`/api/businesses/${biz._id}/interview`, { body: { lang: "en" } })).data;
  console.log(`(${t0() - t} ms) Pratihar:`, r.interview.at(-1)!.text);
  const answers = [
    "It's Sharma Dental Clinic, a dental clinic in Indirapuram, Ghaziabad.",
    "Cleaning is 1200 rupees, filling 1500, root canal price depends on the case.",
    "Monday to Saturday 10 am to 8 pm, Sunday closed. Each appointment is 30 minutes.",
    "Never give medical advice and never promise a price that isn't on the list.",
    "If someone is in pain or bleeding, ask them to come in and call Dr. Sharma on 9876543210.",
  ];
  let last: Draft | null = null;
  for (const a of answers) {
    t = t0();
    last = (await j<Draft>(`/api/businesses/${biz._id}/interview`, { body: { text: a, lang: "en" } })).data;
    console.log(`(${t0() - t} ms) Pratihar:`, last.interview.at(-1)!.text.slice(0, 140), last.done ? "[DONE]" : "");
    if (last.done) break;
  }
  console.log("live draft:", last?.draft?.businessName, "| services:", last?.draft?.services?.length, "| version saved:", last?.version);
  if (!last?.version) {
    await j(`/api/businesses/${biz._id}/card`, { body: {} });
    console.log("card built explicitly");
  }

  step("same business, Hindi mode reply");
  const hi = (await j<{ interview: { text: string }[] }>(`/api/businesses/${biz._id}/interview`, { body: { text: "ठीक है, और कुछ?", lang: "hi" } })).data;
  console.log("Pratihar (hi):", hi.interview.at(-1)!.text.slice(0, 140));

  step("short share link");
  const short = await fetch(`${BASE}/c/${biz._id}`, { redirect: "manual" });
  console.log("/c/ ->", short.status, short.headers.get("location"));

  step("a stranger calls the link (not logged in, business not live yet = test line)");
  const call = (await j<{ callId: string; reply: string; test: boolean }>(`/api/talk/${biz._id}`, { body: {}, auth: false })).data;
  console.log("greeting:", call.reply, "| test line:", call.test);
  for (const said of ["Hello, cleaning ka kya rate hai?", "Kal subah 11 baje ka slot milega? Naam Rahul, number 9810022310."]) {
    t = t0();
    const turn = (await j<{ reply: string; tools: { name: string }[] }>(`/api/talk/${biz._id}`, { body: { callId: call.callId, text: said }, auth: false })).data;
    console.log(`(${t0() - t} ms) caller: ${said}\n   Pratihar: ${turn.reply}\n   tools: ${turn.tools.map((x) => x.name).join(", ") || "-"}`);
  }
  t = t0();
  await j(`/api/talk/${biz._id}/end`, { body: { callId: call.callId }, auth: false });
  console.log(`(${t0() - t} ms) call ended; waiting for the summary to be written…`);
  await new Promise((r) => setTimeout(r, 12000));

  step("owner sees it");
  const calls = (await j<{ calls: { outcome: string; channel: string; summary?: { oneLine: string } }[] }>(`/api/businesses/${biz._id}/calls`)).data;
  console.log("calls:", calls.calls.map((c) => `${c.channel}/${c.outcome}: ${c.summary?.oneLine ?? ""}`));
  const ins = (await j<{ source: string; totals: { calls: number; booked: number } }>(`/api/businesses/${biz._id}/insights?days=7`)).data;
  console.log("reports source:", ins.source, "| totals:", ins.totals);
}
main().catch((e) => {
  console.error("FLOW FAILED:", e.message);
  process.exit(1);
});
