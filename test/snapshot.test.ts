import { describe, expect, it } from "vitest";
import type { RawStats } from "../src/github/client.ts";
import { buildSnapshot, validateSnapshot } from "../src/stats/snapshot.ts";

const full: RawStats = {
  name: "Jordan Tukuna",
  followers: 3,
  reviews: 0,
  commitsTotal: 1383,
  commitsPublic: 246,
  prsTotal: 237,
  prsPublic: 49,
  issuesTotal: 300,
  issuesPublic: 56,
  stars: 0,
};
const at = new Date("2026-10-27T06:00:00Z");
const prev = buildSnapshot(full, at);
const next = (over: Partial<RawStats>) => buildSnapshot({ ...full, ...over }, at);

describe("buildSnapshot", () => {
  it("adds level, percentile and ISO fetchedAt", () => {
    const s = buildSnapshot(full, at);
    expect(s.level).toBe("B+");
    expect(s.percentile).toBeCloseTo(49.3747, 3);
    expect(s.fetchedAt).toBe("2026-10-27T06:00:00.000Z");
    expect(s.commitsTotal).toBe(1383);
  });
});

describe("validateSnapshot", () => {
  it("accepts a first snapshot", () => {
    expect(validateSnapshot(prev, null)).toEqual({ ok: true });
  });

  it("rejects public greater than total", () => {
    const r = validateSnapshot(next({ commitsPublic: 2000 }), null);
    expect(r.ok).toBe(false);
  });

  it("rejects negative, NaN or non-integer counts", () => {
    const fields = [
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
    for (const field of fields) {
      for (const bad of [-1, NaN, 1.5]) {
        const r = validateSnapshot(next({ [field]: bad }), null);
        expect(r.ok, `${field}=${bad}`).toBe(false);
      }
    }
  });

  it("rejects an empty name", () => {
    expect(validateSnapshot(next({ name: "  " }), null).ok).toBe(false);
  });

  it("rejects an all-time counter falling below 90% of previous", () => {
    expect(validateSnapshot(next({ prsTotal: 200 }), prev).ok).toBe(false);
  });

  it("accepts last-year commits falling to 65%", () => {
    expect(validateSnapshot(next({ commitsTotal: 900 }), prev)).toEqual({ ok: true });
  });

  it("rejects last-year commits falling below 50%", () => {
    expect(validateSnapshot(next({ commitsTotal: 600 }), prev).ok).toBe(false);
  });

  it("accepts the exact 90% all-time boundary and rejects just below", () => {
    expect(validateSnapshot(next({ prsTotal: 214 }), prev)).toEqual({ ok: true });
    expect(validateSnapshot(next({ prsTotal: 213 }), prev).ok).toBe(false);
  });

  it("accepts the exact 50% last-year boundary and rejects just below", () => {
    expect(validateSnapshot(next({ commitsTotal: 692 }), prev)).toEqual({ ok: true });
    expect(validateSnapshot(next({ commitsTotal: 691 }), prev).ok).toBe(false);
  });

  it("rejects zero where previous was non-zero", () => {
    expect(validateSnapshot(next({ issuesTotal: 0, issuesPublic: 0 }), prev)).toEqual({
      ok: false,
      reason: "issuesTotal dropped to zero",
    });
  });
});
