import { NextResponse } from "next/server";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wrap a route so thrown errors become JSON a person can read, with the right status. */
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ZodError)
        // Messages we wrote ourselves ("Use at least 8 characters") read fine alone; zod's defaults need the field name.
        return fail(e.issues.map((i) => (/^[A-Z]/.test(i.message) && !i.message.startsWith("Invalid") ? i.message : `${i.path.join(".") || "input"}: ${i.message}`)).join("; "), 422);
      const status = (e as { status?: number }).status ?? 500;
      // A missing key (503) is a setup message, not a crash: one line, no stack.
      if (status === 503) console.warn(`[config] ${(e as Error).message}`);
      else if (status >= 500) console.error(e);
      return fail((e as Error).message || "Something went wrong.", status);
    }
  };
}

export async function body<T>(req: Request, schema: ZodType<T, ZodTypeDef, unknown>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    json = {};
  }
  return schema.parse(json);
}

export type Ctx<P extends Record<string, string>> = { params: Promise<P> };
