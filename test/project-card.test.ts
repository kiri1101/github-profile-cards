import { describe, expect, it } from "vitest";
import { PROJECTS, STACK_COLORS } from "../src/content/projects.ts";
import { cardAssets, layoutStack, pillRect, renderProjectCard } from "../src/render/project-card.ts";
import { escapeXml } from "../src/render/escape.ts";
import { measure } from "../src/render/measure.ts";
import { OCTICONS } from "../src/render/octicons.ts";

const re = (t: string) => escapeXml(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MEDIA = "@media (prefers-color-scheme: dark)";

function styleParts(svg: string): { light: string; dark: string } {
  const css = svg.match(/<style>([\s\S]*?)<\/style>/)![1];
  const i = css.indexOf(MEDIA);
  expect(i).toBeGreaterThan(-1);
  return { light: css.slice(0, i), dark: css.slice(i) };
}

describe("project cards", () => {
  for (const p of PROJECTS) {
    it(`${p.slug} carries its copy`, () => {
      const svg = renderProjectCard(p);
      expect(svg).toContain('width="410" height="124"');
      expect(svg).toContain(escapeXml(p.title));
      expect(svg).toContain(escapeXml(p.desc[0]));
      expect(svg).toContain(escapeXml(p.desc[1]));
      expect(svg).toContain(`>${escapeXml(p.pill)}<`);
      for (const s of p.stack) expect(svg).toContain(`>${escapeXml(s)}<`);
    });
    it(`${p.slug} layout fits`, () => {
      expect(pillRect(p).x).toBeGreaterThanOrEqual(40 + measure(p.title, 14, 600) + 12);
      const stack = layoutStack(p);
      expect(stack[stack.length - 1].end).toBeLessThanOrEqual(394);
    });
  }

  it("renders one self-theming SVG per project", () => {
    for (const p of PROJECTS) {
      const svg = renderProjectCard(p);
      expect(svg).toContain("<style>");
      const { light, dark } = styleParts(svg);
      for (const c of ["#ffffff", "#d1d9e0", "#0969da", "#59636e"]) {
        expect(light, c).toContain(c);
        expect(dark, c).not.toContain(c);
      }
      for (const c of ["#0d1117", "#30363d", "#4493f8", "#9198a1"]) {
        expect(dark, c).toContain(c);
        expect(light, c).not.toContain(c);
      }
      expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
      expect(svg).not.toContain("url(");
    }
  });
  it("coloured elements use classes, not hard-coded theme colours", () => {
    for (const p of PROJECTS) {
      const svg = renderProjectCard(p);
      expect(svg).toMatch(/<rect x="0.5" y="0.5" rx="6" width="409" height="123" class="pc-bg"\/>/);
      expect(svg).toMatch(/<text [^>]*class="pc-title"[^>]*>/);
      for (const line of p.desc) expect(svg).toMatch(new RegExp(`<text [^>]*class="pc-muted"[^>]*>${re(line)}</text>`));
      expect(svg).toMatch(/<rect x="[\d.]+" y="15"[^>]*class="pc-pill"/);
      expect(svg).toMatch(new RegExp(`<text [^>]*class="pc-muted"[^>]*>${re(p.pill)}</text>`));
      expect(svg).toMatch(/<path class="pc-muted"/);
      expect(svg).not.toMatch(/(?:fill|stroke)="#(?:ffffff|d1d9e0|0969da|59636e|0d1117|30363d|4493f8|9198a1)"/i);
    }
  });
  it("Next.js dot switches theme", () => {
    const e = PROJECTS.find((x) => x.slug === "equip4safety")!;
    const svg = renderProjectCard(e);
    const { light, dark } = styleParts(svg);
    const dots = svg.match(/<circle[^>]*class="([^"]+)"/g)!;
    expect(dots).toHaveLength(1);
    const cls = dots[0].match(/class="([^"]+)"/)![1];
    expect(light).toMatch(new RegExp(`\.${cls}\s*\{[^}]*#1f2328`));
    expect(dark).toMatch(new RegExp(`\.${cls}\s*\{[^}]*#e6edf3`));
    for (const label of ["Laravel 12", "React 19"]) {
      expect(svg).toContain(`fill="${STACK_COLORS[label].light}"`);
      expect(STACK_COLORS[label].light).toBe(STACK_COLORS[label].dark);
    }
  });
  it("escapes apostrophes", () => {
    expect(renderProjectCard(PROJECTS[1])).toContain("TTS&#39;s");
  });
  it("uses the briefcase for clients and the repo icon for SchuLyf", () => {
    for (const p of PROJECTS) {
      const svg = renderProjectCard(p);
      if (p.slug === "schulyf") {
        expect(svg).toContain(`d="${OCTICONS.repo}"`);
        expect(svg).not.toContain(OCTICONS.briefcase);
        expect(svg).toContain(">Public<");
      } else {
        expect(svg).toContain(`d="${OCTICONS.briefcase}"`);
        expect(svg).not.toContain(OCTICONS.repo);
      }
    }
  });
  it("every stack label has colours", () => {
    for (const p of PROJECTS) for (const s of p.stack) expect(STACK_COLORS[s], s).toBeDefined();
  });
  it("an unknown stack label throws a clear error", () => {
    expect(() => renderProjectCard({ ...PROJECTS[0], stack: ["Cobol"] })).toThrow(/"Cobol"/);
  });
  it("description lines fit before the right edge", () => {
    for (const p of PROJECTS) for (const line of p.desc) expect(16 + measure(line, 12, 400), line).toBeLessThanOrEqual(394);
  });
  it("cardAssets returns 6 self-theming cards", () => {
    const assets = cardAssets();
    expect(assets.map((a) => a.path).sort()).toEqual(PROJECTS.map((p) => `cards/${p.slug}.svg`).sort());
    expect(assets).toHaveLength(6);
    for (const a of assets) expect(a.svg).toContain(MEDIA);
    expect(PROJECTS.map((p) => p.slug)).toEqual(["services-publics", "kiosks", "fonction-publique", "banking", "equip4safety", "schulyf"]);
  });
});
