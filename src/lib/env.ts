// One place that reads process.env, so a missing key fails with a sentence a person can act on.
const read = (k: string) => (process.env[k] ?? "").trim();

export const env = {
  geminiKey: read("GEMINI_API_KEY"),
  geminiModel: read("GEMINI_MODEL") || "gemini-3.5-flash",
  elevenKey: read("ELEVENLABS_API_KEY"),
  elevenWebhookSecret: read("ELEVENLABS_WEBHOOK_SECRET"),
  defaultVoice: read("ELEVENLABS_VOICE_ID") || "EHeVIpHOvJGuhp2QcMZZ",
  mongoUri: read("MONGODB_URI"),
  mongoDb: read("MONGODB_DB") || "pratihar",
  tigerUrl: read("TIGER_DATABASE_URL"),
  mekoUrl: read("MEKO_MCP_URL") || "https://mcp.mekodata.ai/mcp",
  mekoKey: read("MEKO_API_KEY"),
  mekoDatapack: read("MEKO_DATAPACK_ID"),
  publicUrl: read("PUBLIC_URL") || "http://localhost:3000",
  bookingSecret: read("BOOKING_SECRET") || "dev-only-secret",
  toolsSecret: read("TOOLS_SECRET"),
};

export class ConfigError extends Error {
  status = 503;
}

export function need(value: string, name: string): string {
  if (!value) throw new ConfigError(`${name} is not set. Add it to .env.local and restart the server.`);
  return value;
}

export const integrations = () => ({
  gemini: !!env.geminiKey,
  elevenlabs: !!env.elevenKey,
  mongo: env.mongoUri ? "atlas" : "in-memory (dev)",
  tiger: !!env.tigerUrl,
  meko: !!env.mekoKey,
});
