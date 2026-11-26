// Loads video-agent/.env into process.env (the Agent SDK does not read .env files itself).
// Existing environment variables win over the file.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PACKAGE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function loadDotEnv(file = path.join(PACKAGE_DIR, ".env")) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function envInt(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
