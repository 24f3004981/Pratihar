import { z } from "zod";
import { body, fail, ok, route } from "@/lib/api";
import { clearAttempts, findUserByEmail, startSession, tooManyAttempts, verifyPassword } from "@/lib/auth";

export const POST = route(async (req: Request) => {
  const { email, password } = await body(req, z.object({ email: z.string().trim().toLowerCase().max(120), password: z.string().max(200) }));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `login:${ip}:${email}`;
  if (tooManyAttempts(key)) return fail("Too many tries. Wait 15 minutes and try again.", 429);
  const user = await findUserByEmail(email);
  // Same message either way, so the form can't be used to find out who has an account.
  if (!user || !(await verifyPassword(password, user.passwordHash))) return fail("That email and password don't match.", 401);
  clearAttempts(key);
  await startSession(user._id);
  return ok({ name: user.name, email: user.email });
});
