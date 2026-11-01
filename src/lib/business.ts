import { getDb } from "./db";
import type { Business, JobCard, Version } from "./types";

export class NotFound extends Error {
  status = 404;
}

export async function getBusiness(id: string): Promise<Business> {
  const db = await getDb();
  const b = await db.collection<Business>("businesses").findOne({ _id: id });
  if (!b) throw new NotFound("No business with that ID.");
  return b;
}

export async function getVersion(businessId: string, n: number): Promise<Version> {
  const db = await getDb();
  const v = await db.collection<Version>("versions").findOne({ businessId, n });
  if (!v) throw new NotFound(`Version ${n} does not exist.`);
  return v;
}

export async function listVersions(businessId: string) {
  const db = await getDb();
  return db.collection<Version>("versions").find({ businessId }).sort({ n: -1 }).toArray();
}

/** Save a new version. Versions are append-only; going live or rolling back only moves a pointer. */
export async function createVersion(businessId: string, card: JobCard, note: string, parent: number | null) {
  const db = await getDb();
  const biz = await db
    .collection<Business>("businesses")
    .findOneAndUpdate({ _id: businessId }, { $inc: { latestVersion: 1 }, $set: { card, name: card.businessName } }, { returnDocument: "after" });
  if (!biz) throw new NotFound("No business with that ID.");
  const v: Version = { businessId, n: biz.latestVersion, card, note, createdAt: new Date(), parent };
  await db.collection<Version>("versions").insertOne(v);
  return v;
}

/** The card a caller talks to: the live version on the public line, the latest one while practising. */
export async function cardFor(b: Business, which: "live" | "latest"): Promise<{ card: JobCard; n: number } | null> {
  const n = which === "live" ? b.liveVersion : b.latestVersion || null;
  if (!n) return null;
  const v = await getVersion(b._id, n);
  return { card: v.card, n };
}
