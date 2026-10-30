import type { LangSnapshot } from "../stats/languages.ts";
import { escapeXml } from "./escape.ts";
import { formatUpdated } from "./format.ts";
import { frame } from "./frame.ts";
import { measure, type Theme } from "./measure.ts";
import { FONT, STATS_PALETTE } from "./palette.ts";

export const LANGS_FOOTER_PREFIX = "Incl. private repositories · updated ";

const W = 300;
const H = 165;
const BAR_X = 25;
const BAR_W = 250;
const BAR_Y = 44;
const BAR_H = 8;
const COL_X = [25, 162] as const;
// Right limit of each column's text: 8px gutter before column 2, and the bar's right edge for column 2.
const COL_LIMIT = [154, 275] as const;
const ROW_Y = [72, 97, 122] as const;
const TEXT_OFFSET = 15;

const SIZE = { width: W, height: H };

/** Shorten only the language name (with an ellipsis) until "name pct%" fits `room` px at 12px; the percentage is never cut. */
function fitEntry(name: string, pct: string, room: number): string {
  const fits = (n: string) => measure(`${n} ${pct}`, 12, 400) <= room;
  if (fits(name)) return `${name} ${pct}`;
  let chars = Array.from(name);
  while (chars.length > 0 && !fits(chars.join("").trimEnd() + "…")) chars = chars.slice(0, -1);
  return `${chars.join("").trimEnd()}… ${pct}`;
}

export function renderLangsCard(s: LangSnapshot, theme: Theme): string {
  const C = STATS_PALETTE[theme];
  const updated = formatUpdated(new Date(s.fetchedAt));
  const entries = s.top.slice(0, 6);
  const summary = entries.map((e) => `${e.name} ${e.percent.toFixed(2)}%`).join(", ");
  const clipId = `bar-${theme}`;

  let body = `<title id="t">Most Used Languages</title><desc id="d">${escapeXml(summary)}. ${LANGS_FOOTER_PREFIX}${updated}.</desc>`;
  body += `<text x="25" y="32" style="font:600 17px ${FONT};fill:${C.title}">Most Used Languages</text>`;

  body += `<clipPath id="${clipId}"><rect x="${BAR_X}" y="${BAR_Y}" width="${BAR_W}" height="${BAR_H}" rx="4"/></clipPath><g clip-path="url(#${clipId})">`;
  const total = entries.reduce((a, e) => a + e.percent, 0);
  let x = BAR_X;
  entries.forEach((e, i) => {
    const w = i === entries.length - 1 ? BAR_X + BAR_W - x : (e.percent / total) * BAR_W;
    body += `<rect data-seg="${i}" x="${+x.toFixed(2)}" y="${BAR_Y}" width="${+w.toFixed(2)}" height="${BAR_H}" fill="${escapeXml(e.color)}"/>`;
    x += w;
  });
  body += `</g>`;

  entries.forEach((e, i) => {
    const col = i < 3 ? 0 : 1;
    const cx = COL_X[col];
    const y = ROW_Y[i % 3];
    const room = COL_LIMIT[col] - (cx + TEXT_OFFSET);
    const text = fitEntry(e.name, `${e.percent.toFixed(2)}%`, room);
    body += `<circle cx="${cx + 5}" cy="${y - 4}" r="5" fill="${escapeXml(e.color)}"/>`;
    body += `<text data-entry="${i}" x="${cx + TEXT_OFFSET}" y="${y}" style="font:400 12px ${FONT};fill:${C.text}">${escapeXml(text)}</text>`;
  });

  body += `<text x="25" y="152" style="font:400 10.5px ${FONT};fill:${C.muted}">${LANGS_FOOTER_PREFIX}${updated}</text>`;
  return frame(C.background, "t d", body, SIZE);
}

/** Neutral card served before the first successful refresh: never zeros. */
export function renderLangsPlaceholder(theme: Theme): string {
  const C = STATS_PALETTE[theme];
  return frame(
    C.background,
    "t",
    `<title id="t">Languages are updating</title><text x="${W / 2}" y="${H / 2}" text-anchor="middle" dominant-baseline="central" style="font:400 14px ${FONT};fill:${C.muted}">Languages are updating</text>`,
    SIZE,
  );
}
