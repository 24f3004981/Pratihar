// Lists Gemini models this key can call: `npx tsx --env-file=.env.local scripts/list-models.ts`
async function main() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": key } });
  const json = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[]; error?: unknown };
  if (!res.ok) throw new Error(JSON.stringify(json.error));
  for (const m of json.models ?? []) if (m.supportedGenerationMethods?.includes("generateContent")) console.log(m.name);
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
