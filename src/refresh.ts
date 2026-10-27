import { fetchRawStats, GitHubError } from "./github/client.ts";
import { renderStatsCard } from "./render/stats-card.ts";
import { buildSnapshot, validateSnapshot, type Snapshot } from "./stats/snapshot.ts";

export const KEY_LIGHT = "stats-light.svg";
export const KEY_DARK = "stats-dark.svg";
export const KEY_SNAPSHOT = "snapshot.json";

export type RefreshResult = { ok: true } | { ok: false; reason: string };

function fail(reason: string): RefreshResult {
  console.error(JSON.stringify({ event: "refresh_failed", reason }));
  return { ok: false, reason };
}

export async function refresh(
  env: Env,
  now: Date,
  fetchFn: typeof fetch = fetch,
): Promise<RefreshResult> {
  try {
    const prev = await env.STATS.get<Snapshot>(KEY_SNAPSHOT, "json");
    const raw = await fetchRawStats(
      env.GITHUB_LOGIN,
      { profile: env.GH_TOKEN_PROFILE, repos: env.GH_TOKEN_REPOS },
      fetchFn,
    );
    const next = buildSnapshot(raw, now);
    const verdict = validateSnapshot(next, prev);
    if (!verdict.ok) return fail(verdict.reason);
    await Promise.all([
      env.STATS.put(KEY_LIGHT, renderStatsCard(next, "light")),
      env.STATS.put(KEY_DARK, renderStatsCard(next, "dark")),
      env.STATS.put(KEY_SNAPSHOT, JSON.stringify(next)),
    ]);
    return { ok: true };
  } catch (e) {
    // Only the HTTP status or error message is logged; tokens never appear in either.
    if (e instanceof GitHubError) {
      return fail(e.status !== null ? `GitHub HTTP ${e.status}` : e.message);
    }
    return fail(e instanceof Error ? e.message : "unknown error");
  }
}
