import { describe, expect, it } from "vitest";
import { GitHubError } from "../src/github/client.ts";
import { fetchLanguageTotals, type LanguageTotal } from "../src/github/languages.ts";
import { buildLangSnapshot, validateLangTotals } from "../src/stats/languages.ts";
import page1 from "./fixtures/langs-page1.json" with { type: "json" };
import page2 from "./fixtures/langs-page2.json" with { type: "json" };

type Call = { query: string; variables: Record<string, string | null>; headers: Headers };

function stub(pages: Response[] = [Response.json(page1), Response.json(page2)]) {
  const calls: Call[] = [];
  let i = 0;
  const fetchFn = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { query: string; variables: Call["variables"] };
    calls.push({ query: body.query, variables: body.variables, headers: new Headers(init?.headers) });
    return pages[Math.min(i++, pages.length - 1)];
  }) as typeof fetch;
  return { fetchFn, calls };
}

const fixtureTotals: LanguageTotal[] = [
  { name: "PHP", color: "#4F5D95", bytes: 7000 },
  { name: "Vue", color: "#41b883", bytes: 5000 },
  { name: "TypeScript", color: "#3178c6", bytes: 1500 },
  { name: "C#", color: null, bytes: 500 },
];

describe("fetchLanguageTotals", () => {
  it("sums every page", async () => {
    const { fetchFn, calls } = stub();
    expect(await fetchLanguageTotals("kiri1101", "test-repos", fetchFn)).toEqual(fixtureTotals);
    expect(calls).toHaveLength(2);
    expect(calls[0].variables.after).toBeNull();
    expect(calls[1].variables.after).toBe("c1");
    for (const c of calls) expect(c.headers.get("Authorization")).toBe("bearer test-repos");
  });

  it("has the expected query shape", async () => {
    const { fetchFn, calls } = stub();
    await fetchLanguageTotals("kiri1101", "t", fetchFn);
    expect(calls[0].query).toContain("isFork: false");
    expect(calls[0].query).toContain("ownerAffiliations: OWNER");
    expect(calls[0].query).toContain("orderBy: {field: SIZE, direction: DESC}");
  });

  it("throws GitHubError on HTTP 401", async () => {
    const { fetchFn } = stub([new Response("Bad credentials", { status: 401 })]);
    const err = await fetchLanguageTotals("kiri1101", "t", fetchFn).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GitHubError);
    expect((err as GitHubError).status).toBe(401);
  });

  it("throws GitHubError on a 200 with errors", async () => {
    const { fetchFn } = stub([Response.json({ errors: [{ message: "boom" }] })]);
    await expect(fetchLanguageTotals("kiri1101", "t", fetchFn)).rejects.toBeInstanceOf(GitHubError);
  });
});

describe("buildLangSnapshot", () => {
  it("computes percentages", () => {
    const s = buildLangSnapshot(
      [
        { name: "A", color: "#111111", bytes: 600 },
        { name: "B", color: "#222222", bytes: 300 },
        { name: "C", color: "#333333", bytes: 100 },
      ],
      new Date("2026-10-30T10:00:00Z"),
    );
    expect(s.top.map((e) => e.percent)).toEqual([60, 30, 10]);
  });

  it("rounds each fixture percentage individually", () => {
    const s = buildLangSnapshot(fixtureTotals, new Date());
    expect(s.top.map((e) => e.percent)).toEqual([50, 35.71, 10.71, 3.57]);
  });

  it("keeps the top 6 and they add up to about 100", () => {
    const totals = Array.from({ length: 8 }, (_, i) => ({ name: `L${i}`, color: "#abcdef", bytes: 1000 - i * 111 }));
    const s = buildLangSnapshot(totals, new Date());
    expect(s.top).toHaveLength(6);
    expect(s.top.map((e) => e.name)).toEqual(["L0", "L1", "L2", "L3", "L4", "L5"]);
    const sum = s.top.reduce((a, e) => a + e.percent, 0);
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(0.03 + 1e-9);
  });

  it("falls back for a null colour and stores ISO time", () => {
    const s = buildLangSnapshot(fixtureTotals, new Date("2026-10-30T10:00:00Z"));
    expect(s.top.find((e) => e.name === "C#")!.color).toBe("#8b949e");
    expect(s.fetchedAt).toBe("2026-10-30T10:00:00.000Z");
  });
});

describe("validateLangTotals", () => {
  const bad: [string, LanguageTotal[]][] = [
    ["empty list", []],
    ["zero total", [{ name: "A", color: null, bytes: 0 }]],
    ["negative bytes", [{ name: "A", color: null, bytes: -1 }, { name: "B", color: null, bytes: 5 }]],
    ["NaN bytes", [{ name: "A", color: null, bytes: NaN }]],
    ["non-integer bytes", [{ name: "A", color: null, bytes: 1.5 }]],
    ["empty name", [{ name: "", color: null, bytes: 5 }]],
  ];
  for (const [label, totals] of bad) {
    it(`rejects ${label}`, () => {
      const r = validateLangTotals(totals);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason.length).toBeGreaterThan(0);
    });
  }
  it("accepts the fixture totals", () => {
    expect(validateLangTotals(fixtureTotals)).toEqual({ ok: true });
  });
});
