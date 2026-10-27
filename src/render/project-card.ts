import { escapeXml } from "./escape.ts";
import { measure } from "./measure.ts";
import type { Theme } from "./measure.ts";
import { OCTICONS } from "./octicons.ts";
import { CARD_PALETTE, FONT } from "./palette.ts";
import { STACK_COLORS } from "../content/projects.ts";
import type { Project } from "../content/projects.ts";

const WIDTH = 410;
const HEIGHT = 124;
const PILL_RIGHT = 394;

export function pillRect(p: Project): { x: number; width: number } {
  const width = measure(p.pill, 12, 500) + 16;
  return { x: PILL_RIGHT - width, width };
}

/** Dot left edge, label, and label right edge for each stack entry, measured rather than estimated. */
export function layoutStack(p: Project): { x: number; label: string; end: number }[] {
  let x = 16;
  return p.stack.map((label) => {
    const end = x + 16 + measure(label, 12, 400);
    const item = { x, label, end };
    x = end + 14;
    return item;
  });
}

function text(x: number, y: number, s: string, size: number, weight: number, fill: string, anchor = "start"): string {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(s)}</text>`;
}

export function renderProjectCard(p: Project, theme: Theme): string {
  const c = CARD_PALETTE[theme];
  const pill = pillRect(p);
  let body = `<svg x="16" y="17" width="16" height="16" viewBox="0 0 16 16"><path fill="${c.muted}" fill-rule="evenodd" d="${OCTICONS[p.icon]}"/></svg>`;
  body += text(40, 30, p.title, 14, 600, c.title);
  body += `<rect x="${pill.x}" y="15" width="${pill.width}" height="20" rx="10" fill="none" stroke="${c.border}"/>`;
  body += text(pill.x + pill.width / 2, 29, p.pill, 12, 500, c.muted, "middle");
  body += text(16, 58, p.desc[0], 12, 400, c.muted);
  body += text(16, 75, p.desc[1], 12, 400, c.muted);
  for (const s of layoutStack(p)) {
    body += `<circle cx="${s.x + 6}" cy="102" r="6" fill="${STACK_COLORS[s.label][theme]}"/>`;
    body += text(s.x + 16, 106, s.label, 12, 400, c.muted);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(`${p.title}: ${p.pill}`)}"><rect x="0.5" y="0.5" rx="6" width="${WIDTH - 1}" height="${HEIGHT - 1}" fill="${c.background}" stroke="${c.border}"/>${body}</svg>`;
}
