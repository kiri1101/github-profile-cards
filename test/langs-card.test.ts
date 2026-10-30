import { describe, expect, it } from "vitest";
import { formatUpdated } from "../src/render/format.ts";
import { LANGS_FOOTER_PREFIX, renderLangsCard, renderLangsPlaceholder } from "../src/render/langs-card.ts";
import { measure } from "../src/render/measure.ts";
import { buildLangSnapshot } from "../src/stats/languages.ts";

const totals = [
  { name: "PHP", color: "#4F5D95", bytes: 7000 },
  { name: "Vue", color: "#41b883", bytes: 5000 },
  { name: "TypeScript", color: "#3178c6", bytes: 1500 },
  { name: "C#", color: null, bytes: 500 },
];
const at = new Date("2026-10-30T10:00:00Z");
const snap = buildLangSnapshot(totals, at);
const light = renderLangsCard(snap, "light");
const dark = renderLangsCard(snap, "dark");

const six = buildLangSnapshot(
  ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta"].map((name, i) => ({ name, color: "#123456", bytes: 600 - i * 50 })),
  at,
);

function attrs(svg: string, tag: string): Record<string, string>[] {
  return [...svg.matchAll(new RegExp(`<${tag}\\s([^>]*?)/?>`, "g"))].map((m) =>
    Object.fromEntries([...m[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])),
  );
}

describe("renderLangsCard", () => {
  it("has size and accessibility role", () => {
    expect(light).toContain('width="300" height="165"');
    expect(light).toContain('role="img"');
  });

  it("has title and footer", () => {
    expect(light).toContain(">Most Used Languages<");
    expect(light).toContain(">Incl. private repositories · updated 30 Oct 2026<");
  });

  it("shows each entry with its percentage", () => {
    expect(light).toContain(">PHP 50.00%<");
    expect(light).toContain(">Vue 35.72%<");
    expect(light).toContain(">TypeScript 10.71%<");
    expect(light).toContain(">C# 3.57%<");
  });

  it("uses the fallback colour for C#", () => {
    expect(attrs(light, "circle").some((c) => c.fill === "#8b949e")).toBe(true);
    expect(light).not.toContain("null");
  });

  it("draws one bar segment per entry spanning 250px from x=25", () => {
    const segs = attrs(light, "rect").filter((r) => r["data-seg"] !== undefined);
    expect(segs).toHaveLength(4);
    expect(Number(segs[0].x)).toBe(25);
    for (const s of segs) expect(s.height).toBe("8");
    const sum = segs.reduce((a, r) => a + Number(r.width), 0);
    expect(Math.abs(sum - 250)).toBeLessThan(0.5);
    expect(light).toContain("<clipPath");
  });

  it("lays six entries in two columns of three", () => {
    const svg = renderLangsCard(six, "light");
    const dots = attrs(svg, "circle");
    expect(dots).toHaveLength(6);
    expect(dots.map((d) => Number(d.cx) - 5)).toEqual([25, 25, 25, 162, 162, 162]);
    const rows = attrs(svg, "text").filter((t) => t["data-entry"] !== undefined);
    expect(rows.map((t) => Number(t.y))).toEqual([72, 97, 122, 72, 97, 122]);
    expect(rows.map((t) => Number(t.x))).toEqual([40, 40, 40, 177, 177, 177]);
  });

  it("truncates a long name in each column to fit its limit", () => {
    const long = "Jupyter Notebook With A Very Long Name";
    const mk = (i: number) =>
      buildLangSnapshot(
        Array.from({ length: 6 }, (_, k) => ({ name: k === i ? long : `L${k}`, color: "#123456", bytes: 600 - k * 50 })),
        at,
      );
    for (const [idx, limit] of [[0, 154], [3, 275]] as const) {
      const svg = renderLangsCard(mk(idx), "light");
      const t = attrs(svg, "text").filter((x) => x["data-entry"] !== undefined)[idx];
      const content = svg.match(new RegExp(`<text [^>]*data-entry[^>]*x="${t.x}" y="${t.y}"[^>]*>([^<]*)</text>`))![1];
      expect(content).toContain("…");
      expect(content).toMatch(/ \d+\.\d\d%$/);
      expect(Number(t.x) + measure(content, 12, 400)).toBeLessThanOrEqual(limit);
    }
  });

  it("renders only real entries when there are few languages", () => {
    const s = buildLangSnapshot(totals.slice(0, 2), at);
    const svg = renderLangsCard(s, "light");
    expect(attrs(svg, "circle")).toHaveLength(2);
    expect(svg).not.toContain("undefined");
    expect(svg).not.toContain("NaN");
  });

  it("fits the footer for every month", () => {
    for (let m = 0; m < 12; m++) {
      const d = new Date(Date.UTC(2026, m, 28, 10));
      expect(25 + measure(`${LANGS_FOOTER_PREFIX}${formatUpdated(d)}`, 10.5, 400)).toBeLessThanOrEqual(275);
    }
  });

  it("applies the theme palettes", () => {
    expect(light).toContain("#ffffff");
    expect(light).toContain("#1B2B4B");
    expect(dark).toContain("#0d1117");
    expect(dark).toContain("#e6edf3");
    expect(dark).not.toContain("#1B2B4B");
  });
});

describe("renderLangsPlaceholder", () => {
  it("is a neutral 300x165 card without digits in its text", () => {
    for (const [theme, bg] of [["light", "#ffffff"], ["dark", "#0d1117"]] as const) {
      const svg = renderLangsPlaceholder(theme);
      expect(svg).toContain("Languages are updating");
      expect(svg).toContain('width="300" height="165"');
      expect(svg).toContain(bg);
      const texts = [...svg.matchAll(/>([^<]+)</g)].map((m) => m[1]).join("");
      expect(texts).not.toMatch(/\d/);
    }
  });
});
