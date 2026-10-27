import { describe, expect, it } from "vitest";
import type { RawStats } from "../src/github/client.ts";
import { buildSnapshot } from "../src/stats/snapshot.ts";
import { renderStatsCard } from "../src/render/stats-card.ts";
import { renderPlaceholder } from "../src/render/placeholder.ts";
import { FOOTER_PREFIX } from "../src/render/format.ts";
import { measure } from "../src/render/measure.ts";
import { CARD_PALETTE, STATS_PALETTE } from "../src/render/palette.ts";

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

describe("palettes", () => {
  it("defines the ruled card colours", () => {
    expect(CARD_PALETTE.light).toMatchObject({ background: "#ffffff", border: "#d1d9e0", title: "#0969da", muted: "#59636e" });
    expect(CARD_PALETTE.dark).toMatchObject({ background: "#0d1117", border: "#30363d", title: "#4493f8", muted: "#9198a1" });
    expect(STATS_PALETTE.dark.background).toBe("#0d1117");
  });
});

describe("renderPlaceholder", () => {
  it("is a neutral updating card, never zeros", () => {
    for (const theme of ["light", "dark"] as const) {
      const svg = renderPlaceholder(theme);
      expect(svg).toContain("updating");
      expect(svg).toContain(STATS_PALETTE[theme].background);
      expect(svg).not.toContain(">0<");
    }
  });
});
