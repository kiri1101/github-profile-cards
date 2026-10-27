import { escapeXml } from "./escape.ts";
import { measure } from "./measure.ts";
import { FONT } from "./palette.ts";
import { TECH_BLOCKS } from "../content/tech-stack.ts";
import type { CustomName } from "../content/tech-stack.ts";

const TILE = 256;
const PITCH = 300;
const GAP = PITCH - TILE;
const SCALE = 48 / TILE;
const MAX_WORDMARK = 200;

const CUSTOM_COLORS: Record<CustomName, string> = {
  Inertia: "#9553E9",
  Quasar: "#1976D2",
  Nitro: "#F96E5B",
  Pest: "#F28D1A",
  Playwright: "#2EAD33",
};

/** Long names are split over two lines so they stay legible at 48px. */
const WORDMARK_LINES: Record<CustomName, string[]> = {
  Inertia: ["Inertia"],
  Quasar: ["Quasar"],
  Nitro: ["Nitro"],
  Pest: ["Pest"],
  Playwright: ["Play", "wright"],
};
const LINE_SPACING = 1.1;

/** A skill-icons style dark tile: Simple Icons logo when a path is given, else a centred wordmark. */
export function renderCustomTile(name: CustomName, simplePath: string | null): string {
  const color = CUSTOM_COLORS[name];
  const rect = `<rect width="${TILE}" height="${TILE}" fill="#242938" rx="60"/>`;
  let body: string;
  if (simplePath) {
    body = `<g transform="translate(53 53) scale(6.25)"><path fill="${color}" d="${escapeXml(simplePath)}"/></g>`;
  } else {
    const lines = WORDMARK_LINES[name];
    let size = 64;
    while (size > 8 && lines.some((l) => measure(l, size, 700) > MAX_WORDMARK)) size -= 1;
    const mid = TILE / 2;
    const step = size * LINE_SPACING;
    body = lines
      .map((line, i) => {
        const y = mid + (i - (lines.length - 1) / 2) * step;
        return `<text x="${mid}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="${FONT}" font-size="${size}" font-weight="700" fill="${color}">${escapeXml(line)}</text>`;
      })
      .join("");
  }
  return `<svg width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}" fill="none">${rect}${body}</svg>`;
}

// Quotes may be single or double. Groups: ID_ATTR (quote, id); URL_REF (quote, id); HREF_REF (attribute, quote, id).
const ID_ATTR = /(?<![\w:-])id=(["'])(.*?)\1/g;
const URL_REF = /url\((["']?)#([^)"']+)\1\)/g;
const HREF_REF = /((?:xlink:)?(?<![\w-])href=)(["'])#(.*?)\2/g;

/** Make every id in a tile unique to that tile, and rewrite url(#id), href="#id" and xlink:href="#id" to match. */
export function namespaceIds(svg: string, prefix: string): string {
  const ids = new Set([...svg.matchAll(ID_ATTR)].map((m) => m[2]));
  if (ids.size === 0) return svg;
  const rename = (id: string) => (ids.has(id) ? `${prefix}-${id}` : id);
  return svg
    .replace(ID_ATTR, (_, q: string, id: string) => `id=${q}${rename(id)}${q}`)
    .replace(URL_REF, (_, q: string, id: string) => `url(${q}#${rename(id)}${q})`)
    .replace(HREF_REF, (_, attr: string, q: string, id: string) => `${attr}${q}#${rename(id)}${q}`);
}

/** Throws unless ids in a composed block are unique and every url(#x) / href="#x" points at one of them. */
export function assertBlockIntegrity(svg: string, label: string): void {
  const seen = new Set<string>();
  for (const m of svg.matchAll(ID_ATTR)) {
    if (seen.has(m[2])) throw new Error(`${label}: duplicate id "${m[2]}"`);
    seen.add(m[2]);
  }
  const refs = [...[...svg.matchAll(URL_REF)].map((m) => m[2]), ...[...svg.matchAll(HREF_REF)].map((m) => m[3])];
  for (const ref of refs) if (!seen.has(ref)) throw new Error(`${label}: reference to missing id "${ref}"`);
}

const px = (n: number): string => String(Number((n * SCALE).toFixed(4)));

/** One SVG for a whole block: tiles placed on a 300-unit pitch, drawn at 48px per tile. */
export function renderTechBlock(tiles: string[], perLine: 2 | 3): string {
  const rows = Math.ceil(tiles.length / perLine);
  const w = perLine * PITCH - GAP;
  const h = rows * PITCH - GAP;
  const placed = tiles
    .map((t, i) => {
      const x = (i % perLine) * PITCH;
      const y = Math.floor(i / perLine) * PITCH;
      return `<svg x="${x}" y="${y}" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">${t}</svg>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px(w)}" height="${px(h)}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Technology icons">${placed}</svg>`;
}

/** Contents of the vendored icon files: skill-icons SVGs by id, Simple Icons path data by lowercase name. */
export type IconFiles = { skill: Record<string, string>; simple: Record<string, string> };

/** All six block assets (path relative to public/, and SVG). */
export function blockAssets(files: IconFiles): { path: string; svg: string }[] {
  return TECH_BLOCKS.map((block) => {
    const tiles = block.icons.map((icon, i) => {
      if (icon.kind === "skill") {
        const svg = files.skill[icon.id];
        if (!svg) throw new Error(`Missing vendored skill icon "${icon.id}"`);
        return namespaceIds(svg, `t${i}`);
      }
      return namespaceIds(renderCustomTile(icon.name, files.simple[icon.name.toLowerCase()] ?? null), `t${i}`);
    });
    return { path: `stack/${block.slug}.svg`, svg: renderTechBlock(tiles, block.perLine) };
  });
}
