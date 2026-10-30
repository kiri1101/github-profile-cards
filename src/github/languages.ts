import { GitHubError, graphql } from "./client.ts";

export type LanguageTotal = { name: string; color: string | null; bytes: number };

const LANGS_QUERY = `query($login: String!, $after: String) {
  user(login: $login) {
    repositories(ownerAffiliations: OWNER, isFork: false, first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        languages(first: 20, orderBy: {field: SIZE, direction: DESC}) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

type LangsData = {
  user: {
    repositories: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: ({ languages: { edges: ({ size: number; node: { name: string; color: string | null } } | null)[] | null } | null } | null)[];
    };
  } | null;
};

// 100 repos per page. 20 pages (2,000 repos) is sized to the free plan's 50-subrequest budget per
// invocation (shared with the stats requests), so the cap can actually trigger before the platform limit.
const MAX_PAGES = 20;

/** Biggest first; equal bytes are ordered by name so the order never depends on API ordering. */
export function sortTotals(totals: LanguageTotal[]): LanguageTotal[] {
  return [...totals].sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name));
}

/** Bytes per language across all owned, non-fork repositories (private and archived included), biggest first. */
export async function fetchLanguageTotals(
  login: string,
  token: string,
  fetchFn: typeof fetch = fetch,
): Promise<LanguageTotal[]> {
  const totals = new Map<string, LanguageTotal>();
  let after: string | null = null;
  const seen = new Set<string>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const data: LangsData = await graphql<LangsData>(fetchFn, token, LANGS_QUERY, { login, after });
    if (!data.user) throw new Error(`GitHub user "${login}" not found in response`);
    const repos = data.user.repositories;
    for (const repo of repos.nodes) {
      for (const edge of repo?.languages?.edges ?? []) {
        if (!edge) continue;
        const cur = totals.get(edge.node.name);
        if (cur) {
          cur.bytes += edge.size;
          cur.color ??= edge.node.color;
        } else {
          totals.set(edge.node.name, { name: edge.node.name, color: edge.node.color, bytes: edge.size });
        }
      }
    }
    if (!repos.pageInfo.hasNextPage) return sortTotals([...totals.values()]);
    const cursor = repos.pageInfo.endCursor;
    if (!cursor) throw new GitHubError("GitHub pagination cursor missing while more pages remain");
    if (seen.has(cursor)) throw new GitHubError("GitHub pagination cursor repeated");
    seen.add(cursor);
    after = cursor;
  }
  throw new Error(`GitHub repositories exceeded ${MAX_PAGES} pages`);
}
