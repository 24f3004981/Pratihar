import { MongoClient, type Db } from "mongodb";
import { randomBytes } from "node:crypto";
import { env } from "./env";

// Survive Next dev hot reloads without opening a new pool every edit.
const g = globalThis as unknown as { __pratiharDb?: Promise<Db> };

async function connect(): Promise<Db> {
  let uri = env.mongoUri;
  if (!uri) {
    if (process.env.NODE_ENV === "production") throw new Error("MONGODB_URI is required in production.");
    // shortcut: dev without Atlas runs a throwaway mongod; data is lost on restart. Set MONGODB_URI to keep it.
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const mem = await MongoMemoryServer.create();
    uri = mem.getUri();
    console.log("[db] MONGODB_URI not set, using in-memory Mongo:", uri);
  }
  const client = await new MongoClient(uri, { serverSelectionTimeoutMS: 8000 }).connect();
  const db = client.db(env.mongoDb);
  await ensureIndexes(db);
  return db;
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    // The double-booking guard lives here, in the database, not in app code.
    // Only live bookings hold a slot, so a cancelled one frees it again.
    db.collection("appointments").createIndex(
      { businessId: 1, start: 1 },
      { unique: true, partialFilterExpression: { status: "booked" }, name: "one_booking_per_slot" },
    ),
    db.collection("appointments").createIndex({ businessId: 1, phone: 1 }),
    db.collection("versions").createIndex({ businessId: 1, n: 1 }, { unique: true }),
    db.collection("calls").createIndex({ businessId: 1, startedAt: -1 }),
    db.collection("events").createIndex({ businessId: 1, time: -1 }),
    db.collection("audit").createIndex({ businessId: 1, at: -1 }),
    db.collection("runs").createIndex({ businessId: 1, createdAt: -1 }),
    db.collection("kb").createIndex({ businessId: 1 }),
    db.collection("kb").createIndex({ text: "text" }),
  ]);
}

export function getDb(): Promise<Db> {
  if (!g.__pratiharDb) {
    g.__pratiharDb = connect().catch((e) => {
      g.__pratiharDb = undefined;
      throw e;
    });
  }
  return g.__pratiharDb;
}

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
export function newId(len = 10): string {
  const bytes = randomBytes(len);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
