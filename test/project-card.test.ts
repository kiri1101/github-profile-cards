import { describe, expect, it } from "vitest";
import { PROJECTS, STACK_COLORS } from "../src/content/projects.ts";
import { cardAssets, layoutStack, pillRect, renderProjectCard } from "../src/render/project-card.ts";
import { escapeXml } from "../src/render/escape.ts";
import { measure } from "../src/render/measure.ts";
import { OCTICONS } from "../src/render/octicons.ts";
import type { Theme } from "../src/render/measure.ts";

const THEMES: Theme[] = ["light", "dark"];

describe("project cards", () => {
  for (const p of PROJECTS) {
    for (const theme of THEMES) {
      it(`${p.slug} ${theme} carries its copy`, () => {
        const svg = renderProjectCard(p, theme);
        expect(svg).toContain('width="410" height="124"');
        expect(svg).toContain(escapeXml(p.title));
        expect(svg).toContain(escapeXml(p.desc[0]));
        expect(svg).toContain(escapeXml(p.desc[1]));
        expect(svg).toContain(`>${escapeXml(p.pill)}<`);
        for (const s of p.stack) expect(svg).toContain(`>${escapeXml(s)}<`);
      });
    }
    it(`${p.slug} layout fits`, () => {
      expect(pillRect(p).x).toBeGreaterThanOrEqual(40 + measure(p.title, 14, 600) + 12);
      const stack = layoutStack(p);
      expect(stack[stack.length - 1].end).toBeLessThanOrEqual(394);
    });
  }

  it("escapes apostrophes", () => {
    expect(renderProjectCard(PROJECTS[1], "light")).toContain("TTS&#39;s");
  });
  it("uses the briefcase for clients and the repo icon for SchuLyf, in both themes", () => {
    for (const theme of THEMES) {
      for (const p of PROJECTS) {
        const svg = renderProjectCard(p, theme);
        if (p.slug === "schulyf") {
          expect(svg).toContain(`d="${OCTICONS.repo}"`);
          expect(svg).not.toContain(OCTICONS.briefcase);
          expect(svg).toContain(">Public<");
        } else {
          expect(svg).toContain(`d="${OCTICONS.briefcase}"`);
          expect(svg).not.toContain(OCTICONS.repo);
        }
      }
    }
  });
  it("dark palette lands on the right elements for every project", () => {
    for (const p of PROJECTS) {
      const svg = renderProjectCard(p, "dark");
      expect(svg).toContain('<rect x="0.5" y="0.5" rx="6" width="409" height="123" fill="#0d1117" stroke="#30363d"/>');
      expect(svg).toMatch(/font-weight="600" fill="#4493f8">[^<]*<\/text>/);
      for (const line of p.desc) expect(svg).toContain(`font-weight="400" fill="#9198a1">${escapeXml(line)}</text>`);
      expect(svg).toMatch(/<rect x="[\d.]+" y="15"[^>]*stroke="#30363d"/);
      expect(svg).toMatch(/<path fill="#9198a1"/);
    }
  });
  it("Next.js dot flips between themes", () => {
    const e = PROJECTS.find((x) => x.slug === "equip4safety")!;
    const dot = (svg: string) => svg.match(/<circle[^>]*fill="(#[0-9a-fA-F]{6})"/g)!.filter((c) => /#(1f2328|e6edf3)/.test(c));
    expect(dot(renderProjectCard(e, "dark"))).toHaveLength(1);
    expect(dot(renderProjectCard(e, "dark"))[0]).toContain("#e6edf3");
    expect(dot(renderProjectCard(e, "light"))).toHaveLength(1);
    expect(dot(renderProjectCard(e, "light"))[0]).toContain("#1f2328");
  });
  it("every stack label has colours", () => {
    for (const p of PROJECTS) for (const s of p.stack) expect(STACK_COLORS[s], s).toBeDefined();
  });
  it("an unknown stack label throws a clear error", () => {
    expect(() => renderProjectCard({ ...PROJECTS[0], stack: ["Cobol"] }, "light")).toThrow(/"Cobol"/);
  });
  it("description lines fit before the right edge", () => {
    for (const p of PROJECTS) for (const line of p.desc) expect(16 + measure(line, 12, 400), line).toBeLessThanOrEqual(394);
  });
  it("cardAssets returns the 12 expected files", () => {
    const paths = cardAssets().map((a) => a.path).sort();
    const expected = PROJECTS.flatMap((p) => THEMES.map((t) => `cards/${p.slug}-${t}.svg`)).sort();
    expect(paths).toHaveLength(12);
    expect(paths).toEqual(expected);
    expect(PROJECTS.map((p) => p.slug)).toEqual(["services-publics", "kiosks", "fonction-publique", "banking", "equip4safety", "schulyf"]);
  });
});
