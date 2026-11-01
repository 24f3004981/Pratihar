import { Pool } from "pg";
import { getDb } from "./db";
import { env } from "./env";
import { istParts } from "./calendar";
import { tigerPoolConfig } from "./tiger-config";

/**
 * Pratihar Voice Intelligence.
 * Mongo keeps the business records (cards, bookings, transcripts). TigerData keeps what
 * happened over time: one row per call event in a hypertable, rolled up hourly by a
 * continuous aggregate. The dashboard reads the rollup, so it stays fast at any volume.
 * Without TIGER_DATABASE_URL the same numbers are computed from Mongo's events collection.
 */

export type CallEvent = {
  time: Date;
  businessId: string;
  callId: string;
  kind: "call_completed" | "booking" | "callback" | "handoff" | "urgent" | "tool_denied" | "tool_failed" | "injection";
  version: number | null;
  channel: "web" | "phone" | "widget" | "test";
  intent: string;
  outcome: string;
  sentiment: number; // -1..1
  durationS: number;
};

const g = globalThis as unknown as { __tiger?: Pool; __tigerReady?: Promise<void> };

function pool(): Pool | null {
  if (!env.tigerUrl) return null;
  g.__tiger ??= new Pool(tigerPoolConfig(env.tigerUrl));
  return g.__tiger;
}

// Follows Tiger's hypertable guide: columnstore on, segmented by business (every query filters on it),
// newest first, and an hourly continuous aggregate the dashboard reads instead of raw rows.
const TABLE = `CREATE TABLE IF NOT EXISTS call_events (
     time        TIMESTAMPTZ NOT NULL,
     business_id TEXT NOT NULL,
     call_id     TEXT NOT NULL,
     kind        TEXT NOT NULL,
     version     INT,
     channel     TEXT,
     intent      TEXT,
     outcome     TEXT,
     sentiment   DOUBLE PRECISION,
     duration_s  INT
   )`;

const SCHEMA = [
  `${TABLE} WITH (
     tsdb.hypertable,
     tsdb.partition_column = 'time',
     tsdb.enable_columnstore = true,
     tsdb.segmentby = 'business_id',
     tsdb.orderby = 'time DESC'
   )`,
  `CREATE INDEX IF NOT EXISTS call_events_biz_time ON call_events (business_id, time DESC)`,
  `CREATE MATERIALIZED VIEW IF NOT EXISTS call_hourly
     WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
   SELECT time_bucket(INTERVAL '1 hour', time) AS bucket,
          business_id, version, intent, outcome,
          count(*)                                AS calls,
          sum(duration_s)                         AS duration_s,
          count(*) FILTER (WHERE sentiment < -0.2) AS unhappy
     FROM call_events
    WHERE kind = 'call_completed'
    GROUP BY bucket, business_id, version, intent, outcome
   WITH NO DATA`,
  `CREATE INDEX IF NOT EXISTS call_hourly_biz_bucket ON call_hourly (business_id, bucket DESC)`,
  `SELECT add_continuous_aggregate_policy('call_hourly',
     start_offset => NULL, end_offset => INTERVAL '15 minutes',
     schedule_interval => INTERVAL '15 minutes', if_not_exists => TRUE)`,
  // Retention left to the owner: SELECT add_retention_policy('call_events', INTERVAL '365 days');
];

// TimescaleDB older than 2.20 has no `WITH (tsdb.hypertable)`; fall back to create_hypertable.
const LEGACY = [TABLE, `SELECT create_hypertable('call_events', by_range('time', INTERVAL '7 days'), if_not_exists => TRUE)`];

async function ready(p: Pool) {
  g.__tigerReady ??= (async () => {
    try {
      await p.query(SCHEMA[0]);
    } catch {
      for (const sql of LEGACY) await p.query(sql);
    }
    for (const sql of SCHEMA.slice(1)) await p.query(sql);
  })().catch((e) => {
    g.__tigerReady = undefined;
    throw e;
  });
  return g.__tigerReady;
}

export async function recordEvents(events: CallEvent[]) {
  if (!events.length) return;
  const db = await getDb();
  await db.collection("events").insertMany(events.map((e) => ({ ...e })));
  const p = pool();
  if (!p) return;
  try {
    await ready(p);
    const cols = 10;
    const values = events.flatMap((e) => [
      e.time, e.businessId, e.callId, e.kind, e.version, e.channel, e.intent, e.outcome, e.sentiment, e.durationS,
    ]);
    const rows = events.map((_, i) => `(${Array.from({ length: cols }, (_, j) => `$${i * cols + j + 1}`).join(",")})`);
    await p.query(
      `INSERT INTO call_events (time,business_id,call_id,kind,version,channel,intent,outcome,sentiment,duration_s) VALUES ${rows.join(",")}`,
      values,
    );
  } catch (e) {
    // Mongo already has the events; analytics falls back to it, so a Tiger outage loses nothing.
    console.warn("[tiger] insert failed:", (e as Error).message);
  }
}

export type Analytics = {
  source: "tigerdata" | "mongo";
  days: number;
  totals: { calls: number; handled: number; booked: number; callbacks: number; unconverted: number; avgSec: number; unhappy: number };
  today: { calls: number; booked: number; callbacks: number };
  byDay: { day: string; calls: number; booked: number }[];
  byHour: { hour: number; calls: number }[];
  byWeekday: { dow: number; calls: number; booked: number }[];
  versions: { version: number; calls: number; booked: number; failed: number }[];
  intents: { intent: string; calls: number; booked: number }[];
};

type Row = { day: string; hour: number; dow: number; version: number | null; intent: string; outcome: string; calls: number; seconds: number; unhappy: number };

function summarize(rows: Row[], days: number, source: Analytics["source"]): Analytics {
  const today = istParts(new Date()).date;
  const sum = (f: (r: Row) => boolean) => rows.filter(f).reduce((a, r) => a + r.calls, 0);
  const calls = sum(() => true);
  const booked = sum((r) => r.outcome === "booked");
  const callbacks = sum((r) => r.outcome === "callback");
  const handled = sum((r) => r.outcome !== "dropped" && r.outcome !== "failed");
  const group = <K extends string | number>(key: (r: Row) => K) => {
    const m = new Map<K, { calls: number; booked: number; failed: number }>();
    for (const r of rows) {
      const k = key(r);
      const v = m.get(k) ?? { calls: 0, booked: 0, failed: 0 };
      v.calls += r.calls;
      if (r.outcome === "booked") v.booked += r.calls;
      if (r.outcome === "failed" || r.outcome === "dropped") v.failed += r.calls;
      m.set(k, v);
    }
    return m;
  };
  const dayList = Array.from({ length: days }, (_, i) =>
    istParts(new Date(Date.now() - (days - 1 - i) * 86_400_000)).date,
  );
  const byDayMap = group((r) => r.day);
  const byHourMap = group((r) => r.hour);
  const byDowMap = group((r) => r.dow);
  return {
    source,
    days,
    totals: {
      calls,
      handled,
      booked,
      callbacks,
      unconverted: calls - booked,
      avgSec: calls ? Math.round(rows.reduce((a, r) => a + r.seconds, 0) / calls) : 0,
      unhappy: rows.reduce((a, r) => a + r.unhappy, 0),
    },
    today: {
      calls: sum((r) => r.day === today),
      booked: sum((r) => r.day === today && r.outcome === "booked"),
      callbacks: sum((r) => r.day === today && r.outcome === "callback"),
    },
    byDay: dayList.map((day) => ({ day, calls: byDayMap.get(day)?.calls ?? 0, booked: byDayMap.get(day)?.booked ?? 0 })),
    byHour: Array.from({ length: 24 }, (_, hour) => ({ hour, calls: byHourMap.get(hour)?.calls ?? 0 })),
    byWeekday: Array.from({ length: 7 }, (_, dow) => ({
      dow,
      calls: byDowMap.get(dow)?.calls ?? 0,
      booked: byDowMap.get(dow)?.booked ?? 0,
    })),
    versions: [...group((r) => r.version ?? 0)]
      .map(([version, v]) => ({ version: Number(version), ...v }))
      .sort((a, b) => a.version - b.version),
    intents: [...group((r) => r.intent || "other")]
      .map(([intent, v]) => ({ intent: String(intent), calls: v.calls, booked: v.booked }))
      .sort((a, b) => b.calls - a.calls),
  };
}

export async function analytics(businessId: string, days = 14): Promise<Analytics> {
  const since = new Date(Date.now() - days * 86_400_000);
  const p = pool();
  if (p) {
    try {
      await ready(p);
      const { rows } = await p.query(
        `SELECT to_char(bucket AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
                extract(hour FROM bucket AT TIME ZONE 'Asia/Kolkata')::int AS hour,
                (extract(isodow FROM bucket AT TIME ZONE 'Asia/Kolkata')::int - 1) AS dow,
                version, intent, outcome,
                sum(calls)::int AS calls, coalesce(sum(duration_s),0)::int AS seconds, sum(unhappy)::int AS unhappy
           FROM call_hourly
          WHERE business_id = $1 AND bucket >= $2
          GROUP BY 1,2,3,4,5,6`,
        [businessId, since],
      );
      return summarize(rows as Row[], days, "tigerdata");
    } catch (e) {
      console.warn("[tiger] query failed, using Mongo:", (e as Error).message);
    }
  }
  const db = await getDb();
  const events = await db
    .collection<CallEvent>("events")
    .find({ businessId, kind: "call_completed", time: { $gte: since } })
    .limit(20000)
    .toArray();
  const rows: Row[] = events.map((e) => {
    const s = new Date(e.time.getTime() + 330 * 60_000);
    return {
      day: istParts(e.time).date,
      hour: s.getUTCHours(),
      dow: (s.getUTCDay() + 6) % 7,
      version: e.version,
      intent: e.intent,
      outcome: e.outcome,
      calls: 1,
      seconds: e.durationS,
      unhappy: e.sentiment < -0.2 ? 1 : 0,
    };
  });
  return summarize(rows, days, "mongo");
}

export async function topQuestion(businessId: string, days = 1) {
  const db = await getDb();
  const since = new Date(Date.now() - days * 86_400_000);
  const [top] = await db
    .collection("calls")
    .aggregate<{ _id: string; n: number }>([
      { $match: { businessId, endedAt: { $gte: since }, "summary.topic": { $exists: true } } },
      { $group: { _id: "$summary.topic", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 1 },
    ])
    .toArray();
  return top?._id ?? null;
}
