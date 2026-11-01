// Quick connectivity check: `npx tsx --env-file=.env.local scripts/check-db.ts`
import { MongoClient } from "mongodb";
import { Pool } from "pg";
import { tigerPoolConfig } from "../src/lib/tiger-config";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) console.log("mongo: MONGODB_URI not set");
  else {
    const c = await new MongoClient(uri, { serverSelectionTimeoutMS: 10000 }).connect();
    const db = c.db(process.env.MONGODB_DB || "pratihar");
    await db.collection("_ping").insertOne({ at: new Date() });
    await db.collection("_ping").deleteMany({});
    console.log("mongo: connected, read+write ok on", db.databaseName);
    await c.close();
  }
  const tiger = process.env.TIGER_DATABASE_URL;
  if (!tiger) console.log("tiger: TIGER_DATABASE_URL not set");
  else {
    const p = new Pool(tigerPoolConfig(tiger));
    const { rows } = await p.query("SELECT extversion FROM pg_extension WHERE extname = 'timescaledb'");
    console.log("tiger: connected, timescaledb", rows[0]?.extversion ?? "NOT INSTALLED");
    await p.end();
  }
}
main().catch((e) => {
  console.error("check failed:", e.message);
  process.exit(1);
});
