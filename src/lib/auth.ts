import { createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getDb, newId } from "./db";
import { getBusiness, NotFound } from "./business";
import type { Business } from "./types";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = "pratihar_session";
const SESSION_DAYS = 30;

export type User = { _id: string; email: string; name: string; avatar?: string; passwordHash: string; createdAt: Date };
export const AVATAR_IDS = ["f1", "f2", "f3", "f4", "m1", "m2", "m3", "m4"] as const;
type Session = { _id: string; userId: string; expiresAt: Date };

export class AuthError extends Error {
  status = 401;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltB64, keyB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !keyB64) return false;
  const want = Buffer.from(keyB64, "base64");
  const got = await scrypt(password, Buffer.from(saltB64, "base64"), want.length);
  return got.length === want.length && timingSafeEqual(got, want);
}

// The cookie holds a random token; the database only ever stores its hash.
const tokenId = (token: string) => createHash("sha256").update(token).digest("hex");

let indexed = false;
async function cols() {
  const db = await getDb();
  if (!indexed) {
    await Promise.all([
      db.collection("users").createIndex({ email: 1 }, { unique: true }),
      db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
    indexed = true;
  }
  return { users: db.collection<User>("users"), sessions: db.collection<Session>("sessions") };
}

export async function findUserByEmail(email: string) {
  const { users } = await cols();
  return users.findOne({ email: email.trim().toLowerCase() });
}

export async function updateUser(id: string, patch: { name?: string; avatar?: string }) {
  const { users } = await cols();
  await users.updateOne({ _id: id }, { $set: patch });
}

export async function createUser(name: string, email: string, password: string, avatar?: string): Promise<User> {
  const { users } = await cols();
  const user: User = { _id: newId(12), email: email.trim().toLowerCase(), name: name.trim(), avatar, passwordHash: await hashPassword(password), createdAt: new Date() };
  await users.insertOne(user);
  return user;
}

export async function startSession(userId: string) {
  const { sessions } = await cols();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await sessions.insertOne({ _id: tokenId(token), userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const { sessions } = await cols();
    await sessions.deleteOne({ _id: tokenId(token) });
  }
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<Omit<User, "passwordHash"> | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const { sessions, users } = await cols();
  const s = await sessions.findOne({ _id: tokenId(token), expiresAt: { $gt: new Date() } });
  if (!s) return null;
  return users.findOne({ _id: s.userId }, { projection: { passwordHash: 0 } });
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new AuthError("Please log in again.");
  return u;
}

/** The signed-in owner's business, or a 404 that doesn't reveal whether someone else owns it. */
export async function requireBusiness(id: string): Promise<{ user: Omit<User, "passwordHash">; business: Business }> {
  const user = await requireUser();
  const business = await getBusiness(id);
  if (business.ownerId !== user._id) throw new NotFound("No business with that ID.");
  return { user, business };
}

// shortcut: per-process counter; good for one server. Move to Mongo/Redis before running several instances.
const attempts = new Map<string, { n: number; until: number }>();
export function tooManyAttempts(key: string, max = 8, windowMs = 15 * 60_000): boolean {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.until < now) {
    attempts.set(key, { n: 1, until: now + windowMs });
    return false;
  }
  a.n++;
  return a.n > max;
}
export function clearAttempts(key: string) {
  attempts.delete(key);
}
