import { ok } from "@/lib/api";
import { integrations } from "@/lib/env";

export const GET = async () => ok(integrations());
