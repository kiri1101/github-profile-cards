import { escapeXml } from "./escape.ts";
import { measure } from "./measure.ts";
import { OCTICONS } from "./octicons.ts";
import { CARD_PALETTE, FONT } from "./palette.ts";
import { PROJECTS, STACK_COLORS } from "../content/projects.ts";
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

function text(x: number, y: number, s: string, size: number, weight: number, cls: string, anchor = "start"): string {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" class="${cls}">${escapeXml(s)}</text>`;
}

/** Stack colours that differ between themes get a class; the rest stay plain presentation attributes. */
function themedDots(): { classes: Map<string, string>; light: string; dark: string } {
  const classes = new Map<string, string>();
  let light = "";
  let dark = "";
  for (const [label, c] of Object.entries(STACK_COLORS)) {
    if (c.light === c.dark) continue;
    const cls = `pc-dot-${classes.size + 1}`;
    classes.set(label, cls);
    light += `.${cls}{fill:${c.light}}`;
    dark += `.${cls}{fill:${c.dark}}`;
  }
  return { classes, light, dark };
}

/** One SVG holding both palettes: light by default, dark under the visitor's colour-scheme preference. */
export function renderProjectCard(p: Project): string {
  const L = CARD_PALETTE.light;
  const D = CARD_PALETTE.dark;
  const dots = themedDots();
  const style =
    `.pc-bg{fill:${L.background};stroke:${L.border}}.pc-pill{fill:none;stroke:${L.border}}.pc-title{fill:${L.title}}.pc-muted{fill:${L.muted}}${dots.light}` +
    `@media (prefers-color-scheme: dark){.pc-bg{fill:${D.background};stroke:${D.border}}.pc-pill{stroke:${D.border}}.pc-title{fill:${D.title}}.pc-muted{fill:${D.muted}}${dots.dark}}`;
  const pill = pillRect(p);
  let body = `<svg x="16" y="17" width="16" height="16" viewBox="0 0 16 16"><path class="pc-muted" fill-rule="evenodd" d="${OCTICONS[p.icon]}"/></svg>`;
  body += text(40, 30, p.title, 14, 600, "pc-title");
  body += `<rect x="${pill.x}" y="15" width="${pill.width}" height="20" rx="10" class="pc-pill"/>`;
  body += text(pill.x + pill.width / 2, 29, p.pill, 12, 500, "pc-muted", "middle");
  body += text(16, 58, p.desc[0], 12, 400, "pc-muted");
  body += text(16, 75, p.desc[1], 12, 400, "pc-muted");
  for (const s of layoutStack(p)) {
    const colors = STACK_COLORS[s.label];
    if (!colors) throw new Error(`No STACK_COLORS entry for stack label "${s.label}"`);
    const cls = dots.classes.get(s.label);
    body += cls ? `<circle cx="${s.x + 6}" cy="102" r="6" class="${cls}"/>` : `<circle cx="${s.x + 6}" cy="102" r="6" fill="${colors.light}"/>`;
    body += text(s.x + 16, 106, s.label, 12, 400, "pc-muted");
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(`${p.title}: ${p.pill}`)}"><style>${style}</style><rect x="0.5" y="0.5" rx="6" width="${WIDTH - 1}" height="${HEIGHT - 1}" class="pc-bg"/>${body}</svg>`;
}

/** Every static card asset: path relative to public/, and its SVG. */
export function cardAssets(): { path: string; svg: string }[] {
  return PROJECTS.map((p) => ({ path: `cards/${p.slug}.svg`, svg: renderProjectCard(p) }));
}
