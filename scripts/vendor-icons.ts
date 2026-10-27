import { mkdirSync, writeFileSync } from "node:fs";
import { TECH_BLOCKS } from "../src/content/tech-stack.ts";

const SKILL_DIR = new URL("../assets/icons/skill/", import.meta.url);
const SIMPLE_DIR = new URL("../assets/icons/simple/", import.meta.url);
mkdirSync(SKILL_DIR, { recursive: true });
mkdirSync(SIMPLE_DIR, { recursive: true });

async function get(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

/** skillicons.dev wraps one 256x256 <svg> per icon in an outer 48x48 <svg>; keep only the nested one. */
function extractNested(svg: string, id: string): string {
  let depth = 0;
  let start = -1;
  let nested: string | null = null;
  for (const t of svg.matchAll(/<svg\b[^>]*?(\/?)>|<\/svg>/g)) {
    if (t[0] === "</svg>") {
      depth--;
      if (depth === 1 && start >= 0 && nested === null) nested = svg.slice(start, t.index + t[0].length);
      if (depth === 0 && nested === null) throw new Error(`icon ${id}: no nested <svg> inside the outer one`);
    } else {
      if (t[1] === "/") throw new Error(`icon ${id}: unexpected self-closing <svg>`);
      depth++;
      if (depth === 2 && start < 0) start = t.index;
      else if (depth === 2 || depth > 2) throw new Error(`icon ${id}: expected one outer <svg> and one nested <svg>`);
    }
  }
  if (nested === null || depth !== 0) throw new Error(`icon ${id}: expected one outer <svg> and one nested <svg>`);
  return nested;
}

const ids = TECH_BLOCKS.flatMap((b) => b.icons.flatMap((i) => (i.kind === "skill" ? [i.id] : [])));
for (const id of ids) {
  const nested = extractNested(await get(`https://skillicons.dev/icons?i=${id}`), id);
  writeFileSync(new URL(`${id}.svg`, SKILL_DIR), nested + "\n");
}
for (const name of ["inertia", "quasar"]) {
  const svg = await get(`https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/${name}.svg`);
  writeFileSync(new URL(`${name}.svg`, SIMPLE_DIR), svg.trim() + "\n");
}
console.log(`vendored ${ids.length} skill icons and 2 simple icons`);
