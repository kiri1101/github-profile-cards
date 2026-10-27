import { describe, expect, it } from "vitest";
import { TECH_BLOCKS } from "../src/content/tech-stack.ts";
import { assertBlockIntegrity, blockAssets, namespaceIds, renderCustomTile, renderTechBlock } from "../src/render/tech-block.ts";
import { measure } from "../src/render/measure.ts";

const tiles = (n: number) => Array.from({ length: n }, (_, i) => `<svg data-tile="${i}"/>`);

describe("renderTechBlock", () => {
  it("lays out 6 tiles, 3 per line", () => {
    const svg = renderTechBlock(tiles(6), 3);
    expect(svg).toContain('viewBox="0 0 856 556"');
    expect(svg).toContain('width="160.5"');
    expect(svg).toContain('height="104.25"');
    expect(svg).toMatch(/<svg x="300" y="300" width="256" height="256" viewBox="0 0 256 256"><svg data-tile="4"\/>/);
  });
  it("handles 9/3, 4/2 and 3/3", () => {
    expect(renderTechBlock(tiles(9), 3)).toContain('viewBox="0 0 856 856"');
    const four = renderTechBlock(tiles(4), 2);
    expect(four).toContain('viewBox="0 0 556 556"');
    expect(four).toContain('width="104.25"');
    const three = renderTechBlock(tiles(3), 3);
    expect(three).toContain('viewBox="0 0 856 256"');
    expect(three).toContain('height="48"');
  });
});

describe("namespaceIds", () => {
  const tile = '<svg><defs><linearGradient id="a"/></defs><path fill="url(#a)"/><use href="#a"/></svg>';
  it("prefixes ids and their references", () => {
    const out = namespaceIds(tile, "t0") + namespaceIds(tile, "t1");
    for (const p of ["t0", "t1"]) {
      expect(out).toContain(`id="${p}-a"`);
      expect(out).toContain(`url(#${p}-a)`);
      expect(out).toContain(`href="#${p}-a"`);
    }
    expect(out).not.toContain('id="a"');
    expect(out).not.toContain("url(#a)");
  });
  it("rewrites xlink:href and single-quoted attributes", () => {
    const xl = namespaceIds('<svg><g id="a"/><use xlink:href="#a"/></svg>', "t0");
    expect(xl).toContain('id="t0-a"');
    expect(xl).toContain('xlink:href="#t0-a"');
    const sq = namespaceIds("<svg><g id='a'/><use href='#a'/><path fill=\"url('#a')\"/></svg>", "t1");
    expect(sq).toContain("id='t1-a'");
    expect(sq).toContain("href='#t1-a'");
    expect(sq).toContain("url('#t1-a')");
    expect(sq).not.toMatch(/id='a'/);
  });
});

describe("assertBlockIntegrity", () => {
  it("accepts unique ids with resolving references", () => {
    expect(() => assertBlockIntegrity('<svg><g id="x"/><use href="#x"/><p fill="url(#x)"/></svg>', "b")).not.toThrow();
  });
  it("rejects duplicate ids", () => {
    expect(() => assertBlockIntegrity('<svg><g id="x"/><g id="x"/></svg>', "b")).toThrow(/duplicate id "x"/);
  });
  it("rejects dangling references", () => {
    expect(() => assertBlockIntegrity('<svg><p fill="url(#nope)"/></svg>', "b")).toThrow(/missing id "nope"/);
    expect(() => assertBlockIntegrity('<svg><use xlink:href="#nope"/></svg>', "b")).toThrow(/missing id "nope"/);
  });
});

describe("renderCustomTile", () => {
  const sizeOf = (svg: string) => Number(/font-size="([\d.]+)"/.exec(svg)![1]);
  const linesOf = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
  it("falls back to a centred single-line wordmark", () => {
    const svg = renderCustomTile("Pest", null);
    expect(svg).toContain('fill="#242938"');
    expect(svg).toContain('rx="60"');
    expect(svg).toContain(">Pest<");
    expect(svg).toContain('fill="#F28D1A"');
    expect(svg).toContain('text-anchor="middle"');
    expect(svg).toContain('dominant-baseline="central"');
    expect(svg).toContain('y="128"');
    expect(linesOf(svg)).toEqual(["Pest"]);
    expect(measure("Pest", sizeOf(svg), 700)).toBeLessThanOrEqual(200);
  });
  it("splits Playwright over two legible, evenly spaced lines", () => {
    const svg = renderCustomTile("Playwright", null);
    expect(linesOf(svg)).toEqual(["Play", "wright"]);
    const size = sizeOf(svg);
    expect(size).toBeGreaterThanOrEqual(56);
    for (const l of linesOf(svg)) expect(measure(l, size, 700)).toBeLessThanOrEqual(200);
    const ys = [...svg.matchAll(/<text[^>]* y="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(ys[0] + ys[1]).toBeCloseTo(256, 5);
    expect(ys[1] - ys[0] + size).toBeLessThanOrEqual(256 - 2 * 20);
  });
  it("draws a Simple Icons path scaled into the tile", () => {
    const svg = renderCustomTile("Quasar", "M0 0h24v24z");
    expect(svg).toContain('d="M0 0h24v24z"');
    expect(svg).toContain("#1976D2");
    expect(svg).toContain("translate(53 53) scale(6.25)");
  });
});

describe("TECH_BLOCKS", () => {
  it("matches spec 5.4 counts and grids with full rows", () => {
    expect(TECH_BLOCKS.map((b) => b.icons.length)).toEqual([6, 9, 4, 3, 4, 3]);
    expect(TECH_BLOCKS.map((b) => b.perLine)).toEqual([3, 3, 2, 3, 2, 3]);
    for (const b of TECH_BLOCKS) expect(b.icons.length % b.perLine).toBe(0);
  });
});

describe("blockAssets", () => {
  it("produces six namespaced block files", () => {
    const skill: Record<string, string> = {};
    for (const b of TECH_BLOCKS) for (const i of b.icons) if (i.kind === "skill") skill[i.id] = '<svg width="256" height="256"><path id="g" fill="url(#g)"/></svg>';
    const out = blockAssets({ skill, simple: { inertia: "M0 0h24v24z", quasar: "M0 0h24v24z" } });
    expect(out.map((a) => a.path)).toEqual(TECH_BLOCKS.map((b) => `stack/${b.slug}.svg`));
    expect(out[0].svg).toContain('id="t0-g"');
    expect(out[0].svg).toContain('id="t1-g"');
  });
  it("throws on a missing icon file", () => {
    expect(() => blockAssets({ skill: {}, simple: {} })).toThrow(/php/);
  });
});
