import { z } from "zod";
import { body, ok, route } from "@/lib/api";
import { AVATAR_IDS, currentUser, requireUser, updateUser } from "@/lib/auth";

export const GET = route(async () => {
  const u = await currentUser();
  return ok(u ? { name: u.name, email: u.email, avatar: u.avatar ?? null } : null, { headers: { "cache-control": "no-store" } });
});

export const PATCH = route(async (req: Request) => {
  const u = await requireUser();
  const patch = await body(req, z.object({ name: z.string().trim().min(2, "Tell us your name").max(60).optional(), avatar: z.enum(AVATAR_IDS).optional() }));
  await updateUser(u._id, patch);
  return ok({ name: patch.name ?? u.name, email: u.email, avatar: patch.avatar ?? u.avatar ?? null });
});
