import { existsSync, readFileSync } from "node:fs";
import { fetchRawStats } from "../src/github/client.ts";

const VARS_PATH = new URL("../.dev.vars", import.meta.url);

if (!existsSync(VARS_PATH)) {
  console.error("Missing .dev.vars. Copy .dev.vars.example to .dev.vars and fill in both tokens.");
  process.exit(1);
}

function unquote(value: string): string {
  const first = value[0];
  if (value.length >= 2 && (first === '"' || first === "'") && value.at(-1) === first) {
    return value.slice(1, -1);
  }
  return value;
}

const vars: Record<string, string> = {};
for (const line of readFileSync(VARS_PATH, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq > 0) vars[trimmed.slice(0, eq).trim()] = unquote(trimmed.slice(eq + 1).trim());
}

const profile = vars.GH_TOKEN_PROFILE;
const repos = vars.GH_TOKEN_REPOS;
if (!profile || !repos) {
  console.error("GH_TOKEN_PROFILE and GH_TOKEN_REPOS must both be set in .dev.vars.");
  process.exit(1);
}

let stats;
try {
  stats = await fetchRawStats("kiri1101", { profile, repos });
} catch (err) {
  console.error(`Token check failed: ${err instanceof Error ? err.message : "unknown error"}`);
  process.exit(1);
}

const { name: _name, ...numbers } = stats;
console.log(JSON.stringify(numbers, null, 2));

const minimums = {
  commitsTotal: 1383,
  commitsPublic: 246,
  prsTotal: 237,
  prsPublic: 49,
  issuesTotal: 300,
  issuesPublic: 56,
} as const;

const failures = Object.entries(minimums).filter(
  ([key, min]) => stats[key as keyof typeof minimums] < min,
);
if (failures.length > 0) {
  for (const [key, min] of failures) {
    console.error(`FAIL ${key}: ${stats[key as keyof typeof minimums]} < ${min}`);
  }
  console.error("If prsTotal or issuesTotal is low, add Contents: read-only to the fine-grained token and rerun.");
  process.exit(1);
}
console.log("PASS: all token checks meet the minimums.");
