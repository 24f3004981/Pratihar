import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createHash } from "node:crypto";
import { env } from "./env";

/**
 * Meko is our long-term memory over MCP:
 *  - knowledge base: the owner's PDFs (price lists, policies) are indexed for hybrid search
 *  - memory: facts about returning callers ("Rahul, 98xxxx, had a root canal on 3 Oct")
 *  - conversations: every call transcript, so traces line up per business
 * Every call here is fail-soft. If Meko is down, the receptionist keeps working off Mongo.
 */

const g = globalThis as unknown as { __meko?: Promise<Client>; __mekoConv?: Map<string, string> };
const convs = (g.__mekoConv ??= new Map());

export const mekoEnabled = () => !!env.mekoKey;

function connect(): Promise<Client> {
  if (!g.__meko) {
    g.__meko = (async () => {
      const transport = new StreamableHTTPClientTransport(new URL(env.mekoUrl), {
        requestInit: { headers: { Authorization: `Bearer ${env.mekoKey}` } },
      });
      const c = new Client({ name: "pratihar", version: "1.0.0" });
      await c.connect(transport);
      return c;
    })().catch((e) => {
      g.__meko = undefined;
      throw e;
    });
  }
  return g.__meko;
}

/** Meko wraps results as {"result": "<json string>"} inside an MCP text block. Unwrap all of it. */
function unwrap(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return unwrap(JSON.parse(value));
    } catch {
      return value;
    }
  }
  if (value && typeof value === "object" && "result" in value && Object.keys(value).length === 1) {
    return unwrap((value as { result: unknown }).result);
  }
  return value;
}

async function call(name: string, args: Record<string, unknown>, timeoutMs = 5000): Promise<unknown> {
  if (!mekoEnabled()) return null;
  const c = await connect();
  const res = await Promise.race([
    c.callTool({ name, arguments: { ...args, ...(env.mekoDatapack ? { datapack_id: env.mekoDatapack } : {}) } }),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`meko ${name} timed out`)), timeoutMs)),
  ]);
  const content = (res as { content?: { type: string; text?: string }[] }).content ?? [];
  const text = content.find((c) => c.type === "text")?.text ?? "";
  const out = unwrap(text);
  if (out && typeof out === "object" && "error" in out) throw new Error(`meko ${name}: ${JSON.stringify(out)}`);
  return out;
}

async function soft<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.warn(`[meko] ${label} failed:`, (e as Error).message);
    return fallback;
  }
}

const agentId = (businessId: string) => `pratihar:${businessId}`;
const bizTag = (businessId: string) => `[biz:${businessId}]`;

/** One Meko conversation per call (or per business for background jobs). session_id makes it idempotent. */
async function conversation(key: string, businessId: string, title: string): Promise<string | null> {
  if (convs.has(key)) return convs.get(key)!;
  const out = (await call("conversation_create", { agent_id: agentId(businessId), session_id: key, title })) as {
    id?: string;
  } | null;
  if (!out?.id) return null;
  convs.set(key, out.id);
  return out.id;
}

export function mekoLogTurn(callId: string, businessId: string, user: string, assistant: string) {
  return soft(
    "log turn",
    async () => {
      const id = await conversation(`call-${callId}`, businessId, `Call ${callId}`);
      if (!id) return;
      await call("conversation_add_message", { conversation_id: id, user_prompt: user, assistant_response: assistant });
    },
    undefined,
  );
}

export function mekoRemember(businessId: string, phone: string, fact: string) {
  return soft(
    "remember",
    async () => {
      const id = await conversation(`biz-${businessId}`, businessId, `Pratihar ${businessId}`);
      if (!id) return;
      await call("memory_add", {
        conversation_id: id,
        agent_id: agentId(businessId),
        text: `[${businessId}] caller ${phone}: ${fact}`,
        metadata: JSON.stringify({ businessId, phone }),
      });
    },
    undefined,
  );
}

export function mekoRecall(businessId: string, phone: string): Promise<string[]> {
  return soft(
    "recall",
    async () => {
      const id = await conversation(`biz-${businessId}`, businessId, `Pratihar ${businessId}`);
      if (!id) return [];
      const out = (await call("memory_search", {
        conversation_id: id,
        agent_id: agentId(businessId),
        query: `caller ${phone} previous visits and preferences`,
        limit: 5,
      }, 15000)) as { results?: { memory?: string }[] } | null;
      // memory_search is datapack-wide, so keep only lines tagged with this business and this phone
      return (out?.results ?? [])
        .map((r) => r.memory ?? "")
        .filter((m) => m.includes(`[${businessId}]`) && m.includes(phone))
        .map((m) => m.replace(/^\[[^\]]+\]\s*/, ""))
        .filter((m, i, all) => all.indexOf(m) === i);
    },
    [],
  );
}

export function mekoSearch(businessId: string, query: string): Promise<string[]> {
  return soft(
    "kb search",
    async () => {
      const id = await conversation(`biz-${businessId}`, businessId, `Pratihar ${businessId}`);
      if (!id || !env.mekoDatapack) return [];
      const out = (await call("knowledgebase_search", { conversation_id: id, query, limit: 6 }, 15000)) as
        | { results?: Record<string, unknown>[] }
        | Record<string, unknown>[]
        | null;
      const rows = Array.isArray(out) ? out : (out?.results ?? []);
      // Every line we upload is tagged with its business (see mekoUpload), and Meko's search spans
      // the whole datapack, so keep only this business's lines and strip the tag.
      const tag = bizTag(businessId);
      return rows
        .map((r) => String(r.chunk_text ?? r.content ?? r.text ?? r.chunk ?? ""))
        .filter((txt) => txt.includes(tag))
        .map((txt) => txt.split("\n").filter((l) => l.startsWith(tag)).map((l) => l.slice(tag.length).trim()).join("\n"))
        .filter(Boolean);
    },
    [],
  );
}

/**
 * Push the owner's document into Meko's knowledge base via the presigned S3 flow. We send the
 * extracted text, one tagged line per line of the original, so whichever chunk Meko returns
 * still says which business it belongs to.
 */
export function mekoUpload(businessId: string, filename: string, text: string): Promise<string> {
  const tag = bizTag(businessId);
  const bytes = Buffer.from(
    text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => `${tag} ${l}`).join("\n") + "\n",
    "utf8",
  );
  return soft(
    "upload",
    async () => {
      if (!mekoEnabled()) return "skipped";
      const id = await conversation(`biz-${businessId}`, businessId, `Pratihar ${businessId}`);
      const safeName = `${businessId}__${filename.replace(/\.[^.]+$/, "").replace(/[^\w.\-]+/g, "_")}.txt`;
      const out = (await call(
        "knowledgebase_upload_document",
        {
          conversation_id: id,
          filename: safeName,
          size: bytes.length,
          content_hash: createHash("sha256").update(bytes).digest("hex"),
          content_head_base64: bytes.subarray(0, 3072).toString("base64"),
        },
        10000,
      )) as { url?: string; fields?: Record<string, string>; already_uploaded?: boolean } | null;
      if (!out) return "skipped";
      if (out.already_uploaded) return "already in Meko";
      if (!out.url) return "no upload url";
      const form = new FormData();
      for (const [k, v] of Object.entries(out.fields ?? {})) form.append(k, v);
      form.append("file", new Blob([new Uint8Array(bytes)]), safeName);
      const res = await fetch(out.url, { method: "POST", body: form });
      return res.ok ? "indexing in Meko" : `S3 said ${res.status}`;
    },
    "Meko unreachable, kept locally",
  );
}
