import { z } from "zod";
import { body, ok, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb, newId } from "@/lib/db";
import { env } from "@/lib/env";
import type { Business } from "@/lib/types";

export const GET = route(async () => {
  const user = await requireUser();
  const db = await getDb();
  const list = await db
    .collection<Business>("businesses")
    .find({ ownerId: user._id }, { projection: { name: 1, createdAt: 1, liveVersion: 1, latestVersion: 1 } })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  return ok(list);
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const { name, description } = await body(
    req,
    z.object({ name: z.string().trim().min(2).max(80).optional(), description: z.string().trim().min(20).max(1200).optional() }),
  );
  const b: Business = {
    _id: newId(8),
    ownerId: user._id,
    // the card step renames it from the description once Gemini has read it
    name: name ?? "My business",
    createdAt: new Date(),
    voiceId: env.defaultVoice,
    interview: description ? [{ role: "owner", text: description, at: Date.now() }] : [],
    card: null,
    liveVersion: null,
    latestVersion: 0,
  };
  const db = await getDb();
  await db.collection<Business>("businesses").insertOne(b);
  return ok(b, { status: 201 });
});
