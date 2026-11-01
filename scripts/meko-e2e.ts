// End-to-end check of Meko over MCP: `npx tsx --env-file=.env.local scripts/meko-e2e.ts`
import { env } from "../src/lib/env";
import { mekoEnabled, mekoLogTurn, mekoRecall, mekoRemember, mekoSearch, mekoUpload } from "../src/lib/meko";

async function main() {
  console.log("meko enabled:", mekoEnabled(), "| url:", env.mekoUrl, "| datapack set:", !!env.mekoDatapack);
  const biz = "e2echeck";
  const phone = "9876500099";
  const t0 = Date.now();
  await mekoLogTurn(`e2e-${Date.now()}`, biz, "Kal cleaning ho jayegi?", "Ji, kal 11 baje khaali hai.");
  console.log("log turn ok in", Date.now() - t0, "ms");
  await mekoRemember(biz, phone, "2026-11-01: booked cleaning for 3 Nov, prefers mornings");
  console.log("remember ok");
  // memory indexing is asynchronous on Meko's side; give it a moment
  await new Promise((r) => setTimeout(r, 6000));
  let t = Date.now();
  console.log("recall:", await mekoRecall(biz, phone), "in", Date.now() - t, "ms");
  const doc = `Pratihar e2e price list (${new Date().toISOString()})\nTeeth cleaning: Rs 1200\nFilling: Rs 1500\nRoot canal: price after checkup\nOpen Mon-Sat 10am-8pm.\n`;
  console.log("upload:", await mekoUpload(biz, `price-list-${Date.now()}.txt`, doc));
  t = Date.now();
  for (let i = 0; i < 30; i++) {
    const hits = await mekoSearch(biz, "teeth cleaning price");
    if (hits.length) {
      console.log(`kb search: ${hits.length} hit(s) after ${Math.round((Date.now() - t) / 1000)}s ->`, hits[0].slice(0, 90));
      break;
    }
    if (i === 29) console.log("kb search: still indexing after 150s (Meko indexes in the background)");
    await new Promise((r) => setTimeout(r, 5000));
  }
  process.exit(0);
}
main().catch((e) => {
  console.error("meko e2e failed:", e.message);
  process.exit(1);
});
