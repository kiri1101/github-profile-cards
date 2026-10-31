import type { RawStats } from "./client.ts";

type Visibility = Pick<RawStats, "commitsTotal" | "commitsPublic" | "prsTotal" | "prsPublic" | "issuesTotal" | "issuesPublic">;

/** Failure messages (empty = all good). Totals above public counts prove private items are visible. */
export function evaluateVisibility(stats: Visibility, privateRepos: number): string[] {
  const failures: string[] = [];
  const pairs = [
    ["commitsTotal", "commitsPublic", ""],
    ["prsTotal", "prsPublic", " Add Contents: read-only to the fine-grained token and rerun."],
    ["issuesTotal", "issuesPublic", " Add Contents: read-only to the fine-grained token and rerun."],
  ] as const;
  for (const [total, pub, hint] of pairs) {
    if (stats[total] <= stats[pub]) {
      failures.push(`FAIL ${total} (${stats[total]}) is not above ${pub} (${stats[pub]}): private items are not visible.${hint}`);
    }
  }
  if (privateRepos <= 0) {
    failures.push("FAIL GH_TOKEN_REPOS sees 0 private repositories. Grant the fine-grained token access to all repositories (including private) and rerun.");
  }
  return failures;
}
