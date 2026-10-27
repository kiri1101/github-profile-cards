// One-off generator: Segoe UI advance widths (em units) for the text measurer.
// Run: npm run gen:metrics. Output src/render/metrics.json is committed.
import { readFileSync, writeFileSync } from "node:fs";
import opentype from "opentype.js";

const FILES: Record<string, string> = {
  "400": "C:/Windows/Fonts/segoeui.ttf",
  "600": "C:/Windows/Fonts/seguisb.ttf",
  "700": "C:/Windows/Fonts/segoeuib.ttf",
};

const chars: string[] = [];
for (let c = 32; c <= 126; c++) chars.push(String.fromCharCode(c));
chars.push(..."·—→–’é");

const out: Record<string, Record<string, number>> = {};
for (const [weight, path] of Object.entries(FILES)) {
  const font = opentype.parse(toArrayBuffer(readFileSync(path)));
  const table: Record<string, number> = {};
  for (const ch of chars) {
    const glyph = font.charToGlyph(ch);
    table[ch] = (glyph.advanceWidth ?? 0) / font.unitsPerEm;
  }
  out[weight] = table;
}

writeFileSync(new URL("../src/render/metrics.json", import.meta.url), JSON.stringify(out));
const counts = Object.values(out).map((t) => Object.keys(t).length);
console.log(`wrote metrics.json: ${counts.join("/")} entries`);

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}
