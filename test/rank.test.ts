import { describe, expect, it } from "vitest";
import { calculateRank, levelFor } from "../src/stats/rank.ts";

describe("calculateRank", () => {
  it("public-only numbers grade B-", () => {
    const r = calculateRank({ commits: 246, prs: 49, issues: 56, reviews: 0, stars: 0, followers: 3 });
    expect(r.level).toBe("B-");
    expect(r.percentile).toBeCloseTo(70.9417, 3);
  });

  it("token numbers grade B+", () => {
    const r = calculateRank({ commits: 1383, prs: 237, issues: 300, reviews: 0, stars: 0, followers: 3 });
    expect(r.level).toBe("B+");
    expect(r.percentile).toBeCloseTo(49.3747, 3);
  });
});

describe("levelFor", () => {
  it("maps threshold boundaries", () => {
    expect(levelFor(1)).toBe("S");
    expect(levelFor(1.01)).toBe("A+");
    expect(levelFor(50)).toBe("B+");
    expect(levelFor(50.01)).toBe("B");
    expect(levelFor(100)).toBe("C");
  });
});
