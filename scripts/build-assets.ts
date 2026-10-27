import { mkdirSync, writeFileSync } from "node:fs";
import { PROJECTS } from "../src/content/projects.ts";
import { renderProjectCard } from "../src/render/project-card.ts";
import type { Theme } from "../src/render/measure.ts";

const OUT = new URL("../public/cards/", import.meta.url);
mkdirSync(OUT, { recursive: true });

let count = 0;
for (const p of PROJECTS) {
  for (const theme of ["light", "dark"] as Theme[]) {
    writeFileSync(new URL(`${p.slug}-${theme}.svg`, OUT), renderProjectCard(p, theme));
    count++;
  }
}
console.log(`wrote ${count} project cards to public/cards`);
