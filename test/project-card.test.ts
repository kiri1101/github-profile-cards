import { describe, expect, it } from "vitest";
import { PROJECTS } from "../src/content/projects.ts";
import { layoutStack, pillRect, renderProjectCard } from "../src/render/project-card.ts";
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
  it("uses the briefcase for clients and the repo icon for SchuLyf", () => {
    for (const p of PROJECTS.filter((x) => x.slug !== "schulyf")) expect(renderProjectCard(p, "light")).toContain(OCTICONS.briefcase);
    const s = PROJECTS.find((x) => x.slug === "schulyf")!;
    const svg = renderProjectCard(s, "light");
    expect(svg).toContain(OCTICONS.repo);
    expect(svg).toContain(">Public<");
  });
  it("dark uses the GitHub-native palette", () => {
    const svg = renderProjectCard(PROJECTS[0], "dark");
    for (const c of ["#0d1117", "#30363d", "#4493f8", "#9198a1"]) expect(svg).toContain(c);
  });
  it("Next.js dot flips between themes", () => {
    const e = PROJECTS.find((x) => x.slug === "equip4safety")!;
    expect(renderProjectCard(e, "dark")).toContain('fill="#e6edf3"');
    expect(renderProjectCard(e, "light")).toContain('fill="#1f2328"');
  });
});
