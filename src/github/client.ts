export type RawStats = {
  name: string;
  followers: number;
  reviews: number;
  commitsTotal: number;
  commitsPublic: number;
  prsTotal: number;
  prsPublic: number;
  issuesTotal: number;
  issuesPublic: number;
  stars: number;
};

export class GitHubError extends Error {
  status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

const ENDPOINT = "https://api.github.com/graphql";

const PROFILE_QUERY = `query($login: String!) {
  user(login: $login) {
    name
    followers { totalCount }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestReviewContributions
      commitContributionsByRepository(maxRepositories: 100) {
        repository { isPrivate }
        contributions { totalCount }
      }
    }
  }
}`;

const REPOS_QUERY = `query($login: String!, $prQ: String!, $issueQ: String!) {
  user(login: $login) {
    pullRequests { totalCount }
    openIssues: issues(states: OPEN) { totalCount }
    closedIssues: issues(states: CLOSED) { totalCount }
    repositories(ownerAffiliations: OWNER, first: 100) { nodes { stargazerCount } }
  }
  publicPrs: search(query: $prQ, type: ISSUE) { issueCount }
  publicIssues: search(query: $issueQ, type: ISSUE) { issueCount }
}`;

type ProfileData = {
  user: {
    name: string | null;
    followers: { totalCount: number };
    contributionsCollection: {
      totalCommitContributions: number;
      totalPullRequestReviewContributions: number;
      commitContributionsByRepository: {
        repository: { isPrivate: boolean };
        contributions: { totalCount: number };
      }[];
    };
  } | null;
};

type ReposData = {
  user: {
    pullRequests: { totalCount: number };
    openIssues: { totalCount: number };
    closedIssues: { totalCount: number };
    repositories: { nodes: ({ stargazerCount: number } | null)[] };
  } | null;
  publicPrs: { issueCount: number };
  publicIssues: { issueCount: number };
};

async function graphql<T>(
  fetchFn: typeof fetch,
  token: string,
  query: string,
  variables: Record<string, string>,
): Promise<T> {
  const res = await fetchFn(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "github-profile-cards",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new GitHubError(`GitHub GraphQL request failed with HTTP ${res.status}`, res.status);
  }
  const json = (await res.json()) as {
    data?: T | null;
    errors?: { message?: string }[];
  };
  if (json.errors?.length) {
    const messages = json.errors.map((e) => e.message ?? "unknown error").join("; ");
    throw new GitHubError(`GitHub GraphQL returned errors: ${messages}`, res.status);
  }
  if (!json.data) {
    throw new GitHubError("GitHub GraphQL returned no data", res.status);
  }
  return json.data;
}

export async function fetchRawStats(
  login: string,
  tokens: { profile: string; repos: string },
  fetchFn: typeof fetch = fetch,
): Promise<RawStats> {
  const [profile, repos] = await Promise.all([
    graphql<ProfileData>(fetchFn, tokens.profile, PROFILE_QUERY, { login }),
    graphql<ReposData>(fetchFn, tokens.repos, REPOS_QUERY, {
      login,
      prQ: `author:${login} is:pr is:public`,
      issueQ: `author:${login} is:issue is:public`,
    }),
  ]);

  if (!profile.user || !repos.user) {
    throw new GitHubError(`GitHub user "${login}" not found in response`, null);
  }

  const contrib = profile.user.contributionsCollection;
  const commitsPublic = contrib.commitContributionsByRepository
    .filter((r) => !r.repository.isPrivate)
    .reduce((sum, r) => sum + r.contributions.totalCount, 0);
  const stars = repos.user.repositories.nodes.reduce(
    (sum, n) => sum + (n?.stargazerCount ?? 0),
    0,
  );

  return {
    name: profile.user.name ?? login,
    followers: profile.user.followers.totalCount,
    reviews: contrib.totalPullRequestReviewContributions,
    commitsTotal: contrib.totalCommitContributions,
    commitsPublic,
    prsTotal: repos.user.pullRequests.totalCount,
    prsPublic: repos.publicPrs.issueCount,
    issuesTotal: repos.user.openIssues.totalCount + repos.user.closedIssues.totalCount,
    issuesPublic: repos.publicIssues.issueCount,
    stars,
  };
}
