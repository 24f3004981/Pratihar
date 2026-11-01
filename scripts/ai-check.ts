// Times five interview turns through the app's own hedged generate(): `npx tsx --env-file=.env.local scripts/ai-check.ts`
import { interviewTurn } from "../src/lib/interview";
async function main() {
  for (let i = 0; i < 5; i++) {
    const t = Date.now();
    const r = await interviewTurn([{ role: "assistant", text: "Aapke business ka naam kya hai?", at: 0 }, { role: "owner", text: "Sharma Dental, Delhi mein", at: 0 }], "hinglish");
    console.log(Date.now() - t, "ms", r.reply);
  }
}
main().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
