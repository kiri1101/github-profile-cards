import type { RawStats } from "../github/client.ts";
import { calculateRank, type Level } from "./rank.ts";

export type Snapshot = RawStats & { level: Level; percentile: number; fetchedAt: string };

export function buildSnapshot(raw: RawStats, fetchedAt: Date): Snapshot {
  const { level, percentile } = calculateRank({
    commits: raw.commitsTotal,
    prs: raw.prsTotal,
    issues: raw.issuesTotal,
    reviews: raw.reviews,
    stars: raw.stars,
    followers: raw.followers,
  });
  return { ...raw, level, percentile, fetchedAt: fetchedAt.toISOString() };
}

/** "drop" = a regression rule fired (may be legitimate); "invalid" = structurally impossible data. */
export type Result = { ok: true } | { ok: false; reason: string; kind: "invalid" }
  | { ok: false; reason: string; kind: "drop"; signature: [string, number][] };

const COUNTS = [
  "followers",
  "reviews",
  "commitsTotal",
  "commitsPublic",
  "prsTotal",
  "prsPublic",
  "issuesTotal",
  "issuesPublic",
  "stars",
] as const;

const PAIRS = [
  ["commitsPublic", "commitsTotal"],
  ["prsPublic", "prsTotal"],
  ["issuesPublic", "issuesTotal"],
] as const;

// All-time counters should only grow; last-year commits may legitimately shrink.
const ALL_TIME = ["prsTotal", "issuesTotal", "stars", "followers"] as const;
// Public counters get the zero check only: a repo turning private is a legitimate drop.
const PUBLIC = ["commitsPublic", "prsPublic", "issuesPublic"] as const;
const ALL_TIME_FLOOR = 0.9;
const LAST_YEAR_FLOOR = 0.5;

type Counter = (typeof COUNTS)[number];

export function validateSnapshot(next: Snapshot, prev: Snapshot | null): Result {
  if (typeof next.name !== "string" || next.name.trim() === "") {
    return { ok: false, reason: "empty name", kind: "invalid" };
  }
  for (const k of COUNTS) {
    if (!Number.isInteger(next[k]) || next[k] < 0) {
      return { ok: false, reason: `${k} is not a non-negative integer`, kind: "invalid" };
    }
  }
  for (const [pub, total] of PAIRS) {
    if (next[pub] > next[total]) {
      return { ok: false, reason: `${pub} exceeds ${total}`, kind: "invalid" };
    }
  }
  if (!prev) return { ok: true };

  // Evaluate every drop rule without short-circuiting: the signature must name all failing counters.
  const reasons: string[] = [];
  const signature: [string, number][] = [];
  const flag = (k: Counter, reason: string): void => {
    reasons.push(reason);
    signature.push([k, next[k]]);
  };
  const rolling = (k: Counter, floor: number): void => {
    if (prev[k] > 0 && next[k] === 0) flag(k, `${k} dropped to zero`);
    else if (next[k] < prev[k] * floor) flag(k, `${k} fell from ${prev[k]} to ${next[k]}`);
  };
  for (const k of ALL_TIME) rolling(k, ALL_TIME_FLOOR);
  rolling("commitsTotal", LAST_YEAR_FLOOR);
  for (const k of PUBLIC) if (prev[k] > 0 && next[k] === 0) flag(k, `${k} dropped to zero`);
  if (reasons.length === 0) return { ok: true };
  signature.sort((x, y) => (x[0] < y[0] ? -1 : 1));
  return { ok: false, reason: reasons[0]!, kind: "drop", signature };
}
