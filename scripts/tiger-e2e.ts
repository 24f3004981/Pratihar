// End-to-end check of the TigerData path: schema, insert, continuous aggregate, analytics query.
// `npx tsx --env-file=.env.local scripts/tiger-e2e.ts`  (writes rows for a throwaway business id, then deletes them)
import { Pool } from "pg";
import { analytics, recordEvents, type CallEvent } from "../src/lib/tiger";
import { tigerPoolConfig } from "../src/lib/tiger-config";
import { getDb } from "../src/lib/db";

async function main() {
  const biz = `e2e-${Date.now()}`;
  const now = Date.now();
  const mk = (minsAgo: number, outcome: string, intent: string): CallEvent => ({
    time: new Date(now - minsAgo * 60_000), businessId: biz, callId: `c${minsAgo}`, kind: "call_completed",
    version: 1, channel: "web", intent, outcome, sentiment: 0.4, durationS: 70,
  });
  await recordEvents([mk(30, "booked", "booking"), mk(90, "callback", "price"), mk(26 * 60, "booked", "booking")]);

  const p = new Pool(tigerPoolConfig(process.env.TIGER_DATABASE_URL!));
  const h = await p.query("SELECT hypertable_name FROM timescaledb_information.hypertables WHERE hypertable_name = 'call_events'");
  const c = await p.query("SELECT view_name, materialized_only FROM timescaledb_information.continuous_aggregates WHERE view_name = 'call_hourly'");
  const j = await p.query("SELECT proc_name, schedule_interval::text FROM timescaledb_information.jobs WHERE hypertable_name IN ('call_events') OR proc_name LIKE 'policy_refresh%'");
  console.log("hypertable:", h.rows.length ? "call_events ok" : "MISSING");
  console.log("continuous aggregate:", c.rows[0] ?? "MISSING");
  console.log("jobs:", j.rows.map((r) => `${r.proc_name}@${r.schedule_interval}`).join(", "));

  const a = await analytics(biz, 7);
  console.log("analytics source:", a.source, "| totals:", a.totals, "| intents:", a.intents);

  await p.query("DELETE FROM call_events WHERE business_id LIKE 'e2e-%'");
  // recordEvents also copies every event into Mongo; remove those test rows too
  const db = await getDb();
  await db.collection("events").deleteMany({ businessId: { $regex: "^e2e-" } });
  await p.query("CALL refresh_continuous_aggregate('call_hourly', NULL, NULL)");
  await p.end();
  process.exit(0);
}
main().catch((e) => {
  console.error("e2e failed:", e.message);
  process.exit(1);
});
