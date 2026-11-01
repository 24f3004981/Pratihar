import { ok } from "@/lib/api";
import { VOICES } from "@/lib/eleven";
import { env } from "@/lib/env";

export const GET = async () => ok({ voices: VOICES, default: env.defaultVoice });
