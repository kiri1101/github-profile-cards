import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { TECH_BLOCKS } from "../src/content/tech-stack.ts";
import { cardAssets } from "../src/render/project-card.ts";
import { assertBlockIntegrity, blockAssets } from "../src/render/tech-block.ts";

const PUBLIC = new URL("../public/", import.meta.url);
const ICONS = new URL("../assets/icons/", import.meta.url);

function write(assets: { path: string; svg: string }[]): void {
  for (const a of assets) writeFileSync(new URL(a.path, PUBLIC), a.svg);
}

mkdirSync(new URL("cards/", PUBLIC), { recursive: true });
const cards = cardAssets();
write(cards);
console.log(`wrote ${cards.length} project cards to public/cards`);

const skill: Record<string, string> = {};
for (const b of TECH_BLOCKS)
  for (const i of b.icons)
    if (i.kind === "skill") {
      const svg = readFileSync(new URL(`skill/${i.id}.svg`, ICONS), "utf8").trim();
      if ((svg.match(/<svg\b/g) ?? []).length !== 1) throw new Error(`skill/${i.id}.svg must contain exactly one <svg> root`);
      skill[i.id] = svg;
    }

/** Simple Icons files hold one 24x24 <path>; the tile only needs its path data. */
const simple: Record<string, string> = {};
for (const name of ["inertia", "quasar"]) {
  const svg = readFileSync(new URL(`simple/${name}.svg`, ICONS), "utf8");
  const d = /<path[^>]*\sd="([^"]+)"/.exec(svg)?.[1];
  if (!d) throw new Error(`no path data in simple/${name}.svg`);
  simple[name] = d;
}

mkdirSync(new URL("stack/", PUBLIC), { recursive: true });
const blocks = blockAssets({ skill, simple });
for (const b of blocks) assertBlockIntegrity(b.svg, b.path);
write(blocks);
console.log(`wrote ${blocks.length} tech-stack blocks to public/stack`);
