// Reads a postgres URI on stdin and stores it as TIGER_DATABASE_URL in the local env file.
// Used with: tiger db uri <service> --with-password | npx tsx scripts/set-tiger-url.ts
import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("../.env.local", import.meta.url);
const uri = readFileSync(0, "utf8").trim().split(/\s+/).find((s) => s.startsWith("postgres"));
if (!uri) {
  console.error("no postgres:// URI on stdin");
  process.exit(1);
}
const lines = readFileSync(file, "utf8").split("\n");
const i = lines.findIndex((l) => l.startsWith("TIGER_DATABASE_URL="));
if (i >= 0) lines[i] = `TIGER_DATABASE_URL=${uri}`;
else lines.push(`TIGER_DATABASE_URL=${uri}`);
writeFileSync(file, lines.join("\n"));
console.log("saved TIGER_DATABASE_URL for host", new URL(uri).hostname);
