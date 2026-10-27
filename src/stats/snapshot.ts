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

type Result = { ok: true } | { ok: false; reason: string };

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
const ALL_TIME_FLOOR = 0.9;
const LAST_YEAR_FLOOR = 0.5;

export function validateSnapshot(next: Snapshot, prev: Snapshot | null): Result {
  if (typeof next.name !== "string" || next.name.trim() === "") {
    return { ok: false, reason: "empty name" };
  }
  for (const k of COUNTS) {
    if (!Number.isInteger(next[k]) || next[k] < 0) {
      return { ok: false, reason: `${k} is not a non-negative integer` };
    }
  }
  for (const [pub, total] of PAIRS) {
    if (next[pub] > next[total]) {
      return { ok: false, reason: `${pub} exceeds ${total}` };
    }
  }
  if (!prev) return { ok: true };

  const check = (k: "commitsTotal" | (typeof ALL_TIME)[number], floor: number): Result => {
    if (prev[k] > 0 && next[k] === 0) {
      return { ok: false, reason: `${k} dropped to zero` };
    }
    if (next[k] < prev[k] * floor) {
      return { ok: false, reason: `${k} fell from ${prev[k]} to ${next[k]}` };
    }
    return { ok: true };
  };
  for (const k of ALL_TIME) {
    const r = check(k, ALL_TIME_FLOOR);
    if (!r.ok) return r;
  }
  return check("commitsTotal", LAST_YEAR_FLOOR);
}
