// Fills BOOKING_SECRET and TOOLS_SECRET in the local env file with fresh random values,
// only where they are empty or still the placeholder. Values are never printed.
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("../.env.local", import.meta.url);
let text = readFileSync(file, "utf8");
for (const key of ["BOOKING_SECRET", "TOOLS_SECRET"]) {
  const line = new RegExp(`^${key}=(.*)$`, "m");
  const m = line.exec(text);
  const value = randomBytes(24).toString("base64url");
  if (!m) text = `${text.trimEnd()}\n${key}=${value}\n`;
  else if (!m[1] || m[1] === "change-me") text = text.replace(line, `${key}=${value}`);
  else continue;
  console.log("set", key);
}
writeFileSync(file, text);
