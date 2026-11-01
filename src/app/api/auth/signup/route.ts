import { z } from "zod";
import { body, fail, ok, route } from "@/lib/api";
import { AVATAR_IDS, createUser, findUserByEmail, startSession, tooManyAttempts } from "@/lib/auth";

const Signup = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(60),
  email: z.string().trim().toLowerCase().email("That email doesn't look right").max(120),
  password: z.string().min(8, "Use at least 8 characters").max(200),
  avatar: z.enum(AVATAR_IDS).optional(),
});

export const POST = route(async (req: Request) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (tooManyAttempts(`signup:${ip}`, 10)) return fail("Too many sign-ups from here. Try again in a few minutes.", 429);
  const input = await body(req, Signup);
  if (await findUserByEmail(input.email)) return fail("There's already an account with this email. Log in instead.", 409);
  const user = await createUser(input.name, input.email, input.password, input.avatar);
  await startSession(user._id);
  return ok({ name: user.name, email: user.email, avatar: user.avatar ?? null }, { status: 201 });
});
