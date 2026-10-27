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
  const start = svg.indexOf("<svg", svg.indexOf("<svg") + 4);
  const end = svg.lastIndexOf("</svg>", svg.lastIndexOf("</svg>") - 1) + "</svg>".length;
  if (start < 0 || end <= start) throw new Error(`no nested <svg> in icon ${id}`);
  return svg.slice(start, end);
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
