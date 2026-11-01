import { getDb, newId } from "./db";
import { mekoSearch, mekoUpload } from "./meko";

/**
 * Owner documents live in two places: chunked into Mongo (always works, text index) and
 * pushed to Meko for hybrid semantic search. A search merges both, Mongo first, so the
 * receptionist answers from what the owner actually wrote.
 */

export type KbDoc = { _id: string; businessId: string; file: string; chunk: number; text: string; addedAt: Date };

export async function extractText(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    // pdf-parse's index.js runs a self-test when imported directly; the lib path skips it
    const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default as (b: Buffer) => Promise<{ text: string }>;
    return (await pdf(buf)).text;
  }
  if (/\.(txt|md|csv|json)$/.test(name)) return buf.toString("utf8");
  throw new Error("Upload a PDF, TXT, MD, CSV or JSON file.");
}

export function chunk(text: string, size = 700): string[] {
  const paras = text.replace(/\r/g, "").split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const p of paras) {
    if ((cur + " " + p).length > size && cur) {
      out.push(cur);
      cur = p;
    } else cur = cur ? `${cur}\n${p}` : p;
  }
  if (cur) out.push(cur);
  return out.flatMap((c) => (c.length > size * 2 ? c.match(new RegExp(`.{1,${size}}`, "g")) ?? [] : [c]));
}

export async function addDocument(businessId: string, file: File) {
  const text = await extractText(file);
  if (text.trim().length < 20) throw new Error("Couldn't read any text from that file. Is it a scanned image?");
  const parts = chunk(text);
  const db = await getDb();
  await db.collection<KbDoc>("kb").deleteMany({ businessId, file: file.name });
  await db.collection<KbDoc>("kb").insertMany(
    parts.map((t, i) => ({ _id: newId(), businessId, file: file.name, chunk: i, text: t, addedAt: new Date() })),
  );
  const meko = await mekoUpload(businessId, file.name, text);
  return { file: file.name, chunks: parts.length, chars: text.length, meko };
}

export async function listDocuments(businessId: string) {
  const db = await getDb();
  return db
    .collection<KbDoc>("kb")
    .aggregate<{ _id: string; chunks: number; addedAt: Date }>([
      { $match: { businessId } },
      { $group: { _id: "$file", chunks: { $sum: 1 }, addedAt: { $max: "$addedAt" } } },
      { $sort: { addedAt: -1 } },
    ])
    .toArray();
}

export async function removeDocument(businessId: string, file: string) {
  const db = await getDb();
  await db.collection("kb").deleteMany({ businessId, file });
}

export async function searchKnowledge(businessId: string, query: string, opts: { meko?: boolean } = {}) {
  const db = await getDb();
  const local = await db
    .collection<KbDoc>("kb")
    .find({ businessId, $text: { $search: query } }, { projection: { score: { $meta: "textScore" }, text: 1, file: 1 } })
    .sort({ score: { $meta: "textScore" } })
    .limit(4)
    .toArray()
    .catch(() => [] as KbDoc[]);
  const remote = opts.meko === false ? [] : await mekoSearch(businessId, query);
  const seen = new Set<string>();
  return [...local.map((d) => `(${d.file}) ${d.text}`), ...remote.map((t) => `(meko) ${t}`)]
    .filter((t) => {
      const k = t.slice(0, 80);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 5)
    .map((t) => t.slice(0, 900));
}
