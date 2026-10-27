import { describe, expect, it } from "vitest";
import { fetchRawStats, GitHubError } from "../src/github/client.ts";
import profile from "./fixtures/profile.json" with { type: "json" };
import repos from "./fixtures/repos.json" with { type: "json" };

const tokens = { profile: "P", repos: "R" };

type Call = { query: string; headers: Headers };

function stub(overrides: { profile?: Response; repos?: Response } = {}) {
  const calls: Call[] = [];
  const fetchFn = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { query: string };
    calls.push({ query: body.query, headers: new Headers(init?.headers) });
    if (body.query.includes("contributionsCollection")) {
      return overrides.profile ?? Response.json(profile);
    }
    return overrides.repos ?? Response.json(repos);
  }) as typeof fetch;
  return { fetchFn, calls };
}

describe("fetchRawStats", () => {
  it("maps both responses to RawStats", async () => {
    const { fetchFn } = stub();
    expect(await fetchRawStats("kiri1101", tokens, fetchFn)).toEqual({
      name: "Jordan Tukum Folem",
      followers: 3,
      reviews: 0,
      commitsTotal: 1383,
      commitsPublic: 246,
      prsTotal: 237,
      prsPublic: 49,
      issuesTotal: 300,
      issuesPublic: 56,
      stars: 0,
    });
  });

  it("sends each token only to its own query", async () => {
    const { fetchFn, calls } = stub();
    await fetchRawStats("kiri1101", tokens, fetchFn);
    const p = calls.find((c) => c.query.includes("contributionsCollection"))!;
    const r = calls.find((c) => c.query.includes("pullRequests"))!;
    expect(p.headers.get("Authorization")).toBe("bearer P");
    expect(r.headers.get("Authorization")).toBe("bearer R");
    expect(p.headers.get("User-Agent")).toBeTruthy();
    expect(r.headers.get("User-Agent")).toBeTruthy();
  });

  it("orders owned repositories by stargazers, like upstream", async () => {
    const { fetchFn, calls } = stub();
    await fetchRawStats("kiri1101", tokens, fetchFn);
    const r = calls.find((c) => c.query.includes("pullRequests"))!;
    expect(r.query).toContain("orderBy: {field: STARGAZERS, direction: DESC}");
  });

  it("throws GitHubError with status 401 on 401", async () => {
    const { fetchFn } = stub({ profile: new Response("Bad credentials", { status: 401 }) });
    const err = await fetchRawStats("kiri1101", tokens, fetchFn).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GitHubError);
    expect((err as GitHubError).status).toBe(401);
  });

  it("throws on HTTP 200 with an errors array", async () => {
    const { fetchFn } = stub({
      repos: Response.json({ data: null, errors: [{ message: "Something broke" }] }),
    });
    await expect(fetchRawStats("kiri1101", tokens, fetchFn)).rejects.toBeInstanceOf(GitHubError);
  });

  it("throws when data.user is null", async () => {
    const { fetchFn } = stub({ profile: Response.json({ data: { user: null } }) });
    await expect(fetchRawStats("kiri1101", tokens, fetchFn)).rejects.toBeInstanceOf(GitHubError);
  });

  it("throws GitHubError on a 200 with a non-JSON body", async () => {
    const { fetchFn } = stub({ repos: new Response("not json", { status: 200 }) });
    await expect(fetchRawStats("kiri1101", tokens, fetchFn)).rejects.toBeInstanceOf(GitHubError);
  });

  it("throws GitHubError when a nested field is missing", async () => {
    const { fetchFn } = stub({
      profile: Response.json({ data: { user: { name: "X", followers: { totalCount: 1 } } } }),
    });
    await expect(fetchRawStats("kiri1101", tokens, fetchFn)).rejects.toBeInstanceOf(GitHubError);
  });
});
