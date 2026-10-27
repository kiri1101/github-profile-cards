import { describe, expect, it } from "vitest";
import type { RawStats } from "../src/github/client.ts";
import { buildSnapshot } from "../src/stats/snapshot.ts";
import { renderStatsCard } from "../src/render/stats-card.ts";
import { renderPlaceholder } from "../src/render/placeholder.ts";
import { FOOTER_PREFIX } from "../src/render/format.ts";
import { measure } from "../src/render/measure.ts";
import { STATS_PALETTE } from "../src/render/palette.ts";

const full: RawStats = {
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
};
const snap = buildSnapshot(full, new Date("2026-10-27T10:00:00Z"));
const light = renderStatsCard(snap, "light");
const dark = renderStatsCard(snap, "dark");

describe("renderStatsCard", () => {
  it("has the frame, title and accessibility role", () => {
    expect(light).toContain('width="495" height="290"');
    expect(light).toContain('role="img"');
    expect(light).toContain("Jordan Tukum Folem&#39;s GitHub Stats");
  });

  it("shows every number, public/private/total", () => {
    for (const n of ["1,383", "246", "1,137", "237", "49", "188", "300", "56", "244"]) {
      expect(light).toContain(`>${n}<`);
    }
    expect(light).toContain("—");
  });

  it("shows the grade and the footer with the Douala date", () => {
    expect(light).toContain(">B+<");
    expect(light).toContain(">Private = private repositories, mostly client work · updated 27 Oct 2026<");
  });

  it("sets the ring dashoffset from the percentile", () => {
    const m = /stroke-dashoffset="([\d.]+)"/.exec(light);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeCloseTo(80.66, 1);
  });

  it("has a title and desc listing the numbers", () => {
    expect(light).toMatch(/<title[^>]*>[^<]*Rank: B\+/);
    expect(light).toMatch(/<desc[^>]*>[^<]*1,383[^<]*private repositories/);
  });

  it("uses the right palette per theme", () => {
    expect(light).toContain("#ffffff");
    expect(light).toContain("#1B2B4B");
    expect(dark).toContain("#0d1117");
    expect(dark).toContain("#58a6ff");
    expect(dark).toContain("#e6edf3");
    expect(dark).not.toContain("#1B2B4B");
  });

  it("fits the footer between x=42 and 470 for every month", () => {
    for (const mon of ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]) {
      expect(42 + measure(`${FOOTER_PREFIX}28 ${mon} 2026`, 11.5, 400)).toBeLessThanOrEqual(470);
    }
  });

  it("escapes special characters in the name", () => {
    const svg = renderStatsCard({ ...snap, name: "A & B <C>" }, "light");
    expect(svg).toContain("A &amp; B &lt;C&gt;&#39;s GitHub Stats");
    expect(svg).not.toContain("& ");
    expect(svg).not.toContain("<C");
  });
});

describe("renderStatsCard hardening", () => {
  const circ = 2 * Math.PI * 26;
  const offset = (svg: string) => Number(/stroke-dashoffset="([\d.]+)"/.exec(svg)![1]);
  const titleOf = (svg: string) => {
    const m = /<text x="25" y="38"[^>]*font:600 ([\d.]+)px[^>]*>([^<]*)</.exec(svg)!;
    return { size: Number(m[1]), text: m[2].replace(/&#39;/g, "'") };
  };

  it("shrinks then truncates a long name so it clears the ring", () => {
    const svg = renderStatsCard({ ...snap, name: "Maximilian Bartholomew Montgomery-Featherstonehaugh III of Somewhere" }, "light");
    const { size, text } = titleOf(svg);
    expect(text).toContain("…");
    expect(size).toBeGreaterThanOrEqual(14);
    expect(25 + measure(text, size, 600)).toBeLessThanOrEqual(399.5);
  });

  it("keeps a normal name at 18px untruncated", () => {
    const { size, text } = titleOf(light);
    expect(size).toBe(18);
    expect(text).not.toContain("…");
  });

  it("clamps the private count at zero", () => {
    const svg = renderStatsCard({ ...snap, commitsPublic: 2000 }, "light");
    expect(svg).toMatch(/<text x="400" y="137"[^>]*>0</);
    expect(svg).not.toContain(">-");
  });

  it("clamps the percentile to [0, 100]", () => {
    expect(offset(renderStatsCard({ ...snap, percentile: 150 }, "light"))).toBeCloseTo(circ, 6);
    expect(offset(renderStatsCard({ ...snap, percentile: -5 }, "light"))).toBe(0);
  });

  it("uses the dark card palette only in dark output", () => {
    for (const color of ["#0d1117", "#30363d", "#8b949e"]) expect(dark).toContain(color);
    expect(light).not.toContain("#0d1117");
  });
});

describe("renderPlaceholder", () => {
  it("is a neutral updating card, never numbers", () => {
    for (const theme of ["light", "dark"] as const) {
      const svg = renderPlaceholder(theme);
      expect(svg).toContain("updating");
      expect(svg).toContain(STATS_PALETTE[theme].background);
      expect(svg).toContain(STATS_PALETTE[theme].muted);
      const content = svg.replace(/<[^>]*>/g, " ");
      expect(content).not.toMatch(/\d/);
    }
  });
});
