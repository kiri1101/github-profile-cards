import { fetchRawStats, GitHubError } from "./github/client.ts";
import { renderStatsCard } from "./render/stats-card.ts";
import { buildSnapshot, fingerprint, validateSnapshot, type Snapshot } from "./stats/snapshot.ts";

export const KEY_LIGHT = "stats-light.svg";
export const KEY_DARK = "stats-dark.svg";
export const KEY_SNAPSHOT = "snapshot.json";
export const KEY_PENDING = "pending.json";

/** After this many identical rejected drops (24 h at the 6-hourly cron) the drop is accepted as real. */
const ACCEPT_AFTER = 4;

type Pending = { fingerprint: string; count: number; firstSeenAt: string };

export type RefreshResult = { ok: true } | { ok: false; reason: string };

function fail(reason: string): RefreshResult {
  console.error(JSON.stringify({ event: "refresh_failed", reason }));
  return { ok: false, reason };
}

async function readPrevious(env: Env): Promise<Snapshot | null> {
  try {
    return await env.STATS.get<Snapshot>(KEY_SNAPSHOT, "json");
  } catch {
    // A corrupt snapshot must not wedge every later refresh; start fresh instead.
    console.error(JSON.stringify({ event: "snapshot_unreadable" }));
    return null;
  }
}

async function readPending(env: Env): Promise<Pending | null> {
  try {
    return await env.STATS.get<Pending>(KEY_PENDING, "json");
  } catch {
    return null;
  }
}

async function publish(env: Env, next: Snapshot): Promise<void> {
  await Promise.all([
    env.STATS.put(KEY_LIGHT, renderStatsCard(next, "light")),
    env.STATS.put(KEY_DARK, renderStatsCard(next, "dark")),
  ]);
  // Snapshot last: a partial failure must leave an older prev than the images, never a newer one.
  await env.STATS.put(KEY_SNAPSHOT, JSON.stringify(next));
  await env.STATS.delete(KEY_PENDING);
}

export async function refresh(
  env: Env,
  now: Date,
  fetchFn: typeof fetch = fetch,
): Promise<RefreshResult> {
  try {
    const prev = await readPrevious(env);
    const raw = await fetchRawStats(
      env.GITHUB_LOGIN,
      { profile: env.GH_TOKEN_PROFILE, repos: env.GH_TOKEN_REPOS },
      fetchFn,
    );
    const next = buildSnapshot(raw, now);
    const verdict = validateSnapshot(next, prev);
    if (!verdict.ok) {
      if (verdict.kind === "invalid") return fail(verdict.reason);
      // A drop may be real (transferred or deleted repo); accept it once it has repeated unchanged.
      const fp = fingerprint(next);
      const old = await readPending(env);
      const pending: Pending =
        old && old.fingerprint === fp
          ? { ...old, count: old.count + 1 }
          : { fingerprint: fp, count: 1, firstSeenAt: now.toISOString() };
      if (pending.count < ACCEPT_AFTER) {
        await env.STATS.put(KEY_PENDING, JSON.stringify(pending));
        return fail(verdict.reason);
      }
      console.warn(
        JSON.stringify({ event: "drop_accepted", reason: verdict.reason, count: pending.count }),
      );
      await publish(env, next);
      return { ok: true };
    }
    await publish(env, next);
    return { ok: true };
  } catch (e) {
    // Only the HTTP status or error message is logged; tokens never appear in either.
    if (e instanceof GitHubError) {
      // GitHubError messages never contain tokens; status alone loses the cause (GraphQL errors are HTTP 200).
      return fail(e.status !== null ? `GitHub HTTP ${e.status}: ${e.message}` : e.message);
    }
    return fail(e instanceof Error ? e.message : "unknown error");
  }
}
