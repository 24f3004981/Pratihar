// Copies the keys from the local env file into the linked Vercel project (production), as
// encrypted values, without printing them. Usage: npx tsx scripts/push-vars.ts [KEY=override ...]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SKIP = new Set(["PUBLIC_URL", "VERCEL_OIDC_TOKEN"]);
const overrides = Object.fromEntries(process.argv.slice(2).map((a) => a.split(/=(.*)/s).slice(0, 2)));
const vars = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  .split("\n")
  .map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l.trim()))
  .filter((m): m is RegExpExecArray => !!m && !!m[2] && !SKIP.has(m[1]))
  .map((m) => [m[1], m[2]] as [string, string]);
for (const [k, v] of Object.entries(overrides)) vars.push([k, String(v)]);

for (const [key, value] of vars) {
  execFileSync("npx", ["-y", "vercel@latest", "env", "add", key, "--environment", "production", "--value", value, "--force", "--yes"], { stdio: ["ignore", "ignore", "pipe"] });
  console.log("set", key);
}
