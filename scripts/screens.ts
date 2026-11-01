// Captures README screenshots from a local dev server with a throwaway test account:
// `npx tsx scripts/screens.ts [baseUrl]`
import { chromium } from "playwright";
const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = "docs/screens/";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const api = async (path: string, body?: unknown) => {
    const r = await page.request.post(BASE + path, { data: body ?? {} });
    if (!r.ok()) throw new Error(`${path} ${r.status()} ${await r.text()}`);
    return r.json();
  };
  const shot = async (path: string, file: string, wait = 2500) => {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(wait);
    await page.screenshot({ path: OUT + file });
    console.log("saved", file);
  };

  await shot("/", "landing.png");
  await shot("/login", "login.png", 800);

  await api("/api/auth/signup", { name: "Dr. Sharma", email: `readme-${Date.now()}@test.local`, password: "localtest-123", avatar: "f2" });
  const biz = await api("/api/businesses", { name: "Sharma Dental Clinic" });
  const id = biz._id as string;
  await api(`/api/businesses/${id}/interview`, { lang: "hinglish" });
  for (const a of [
    "Sharma Dental Clinic, Indirapuram, Ghaziabad mein dental clinic hai.",
    "Cleaning 1200 rupaye, filling 1500, root canal ka rate case pe depend karta hai.",
    "Monday se Saturday subah 10 se raat 8, Sunday band. Har appointment 30 minute ka.",
    "Kabhi medical advice mat dena, aur list ke bahar ka rate kabhi mat batana.",
    "Agar kisi ko dard ya bleeding ho to Dr. Sharma ko 9876543210 pe connect karna.",
  ]) {
    const r = await api(`/api/businesses/${id}/interview`, { text: a, lang: "hinglish" });
    if (r.done) break;
  }
  const call = await api(`/api/talk/${id}`, {});
  for (const said of ["Hello, cleaning ka kya rate hai?", "Kal subah 11 baje ka slot milega? Naam Rahul, number 9810022310."])
    await api(`/api/talk/${id}`, { callId: call.callId, text: said });
  await api(`/api/talk/${id}/end`, { callId: call.callId });
  await page.waitForTimeout(12000);

  for (const [tab, file] of [["", "home"], ["explain", "explain"], ["card", "card"], ["practice", "practice"], ["fix", "fix"], ["golive", "golive"], ["calls", "calls"], ["calendar", "calendar"], ["insights", "insights"], ["knowledge", "knowledge"], ["security", "security"]])
    await shot(`/app/${id}${tab ? `?tab=${tab}` : ""}`, `${file}.png`);
  await shot(`/talk/${id}`, "talk.png");
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
