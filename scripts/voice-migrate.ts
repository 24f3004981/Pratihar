// Moves businesses still on the old default voice to the new one: `npx tsx --env-file=.env.local scripts/voice-migrate.ts`
import { MongoClient } from "mongodb";
async function main() {
  const c = await MongoClient.connect(process.env.MONGODB_URI!);
  const r = await c.db("pratihar").collection("businesses").updateMany({ voiceId: "EHeVIpHOvJGuhp2QcMZZ" }, { $set: { voiceId: "KYiVPerWcenyBTIvWbfY" } });
  console.log("updated", r.modifiedCount);
  await c.close();
}
main();
