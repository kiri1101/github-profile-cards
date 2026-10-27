import type { Snapshot } from "../stats/snapshot.ts";
import { escapeXml } from "./escape.ts";
import { FOOTER_PREFIX, formatCount, formatUpdated } from "./format.ts";
import { frame } from "./frame.ts";
import { measure, type Theme } from "./measure.ts";
import { OCTICONS } from "./octicons.ts";
import { FONT, STATS_PALETTE } from "./palette.ts";

const COLS = [330, 400, 470] as const;
const HEADER_Y = 100;
const ROW_GAP = 31;
const CIRCUMFERENCE = 2 * Math.PI * 26;
const TITLE_X = 25;
// Ring centre 440, r 26, stroke 5 puts its left edge at 411.5; keep 12px clear of it.
const TITLE_RIGHT = 440 - 26 - 2.5 - 12;
const TITLE_SUFFIX = "'s GitHub Stats";

/** Largest size from 18px down to 14px at which the title fits; otherwise truncate the name with an ellipsis at 14px. */
function fitTitle(name: string): { text: string; size: number } {
  const room = TITLE_RIGHT - TITLE_X;
  const fits = (t: string, size: number) => measure(t, size, 600) <= room;
  for (let size = 18; size >= 14; size -= 0.5) {
    if (fits(name + TITLE_SUFFIX, size)) return { text: name + TITLE_SUFFIX, size };
  }
  let n = Array.from(name);
  while (n.length > 0 && !fits(n.join("") + "…" + TITLE_SUFFIX, 14)) n = n.slice(0, -1);
  return { text: n.join("") + "…" + TITLE_SUFFIX, size: 14 };
}

const privateCount = (total: number, pub: number) => Math.max(0, total - pub);

export function renderStatsCard(s: Snapshot, theme: Theme): string {
  const C = STATS_PALETTE[theme];
  const icon = (name: keyof typeof OCTICONS, x: number, y: number, size: number, fill: string) =>
    `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 16 16"><path fill="${fill}" fill-rule="evenodd" d="${OCTICONS[name]}"/></svg>`;
  const text = (x: number, y: number, content: string, style: string, anchor = "start") =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" style="${style}">${content}</text>`;

  const rows = [
    { icon: "commits", label: "Commits (last year)", pub: s.commitsPublic, total: s.commitsTotal },
    { icon: "prs", label: "Pull requests", pub: s.prsPublic, total: s.prsTotal },
    { icon: "issues", label: "Issues", pub: s.issuesPublic, total: s.issuesTotal },
    { icon: "star", label: "Stars earned", pub: s.stars, total: s.stars, noPrivate: true },
  ] as const;

  const fitted = fitTitle(s.name);
  const title = escapeXml(fitted.text);
  const percentile = Math.min(100, Math.max(0, s.percentile));
  const updated = formatUpdated(new Date(s.fetchedAt));
  const summary = rows
    .map((r) => {
      const priv = "noPrivate" in r ? "" : `, ${formatCount(privateCount(r.total, r.pub))} private`;
      return `${r.label}: ${formatCount(r.total)} total (${formatCount(r.pub)} public${priv})`;
    })
    .join(". ");
  const a11yTitle = `${title}, Rank: ${escapeXml(s.level)}`;
  const a11yDesc = `${summary}. ${FOOTER_PREFIX}${updated}.`;

  let body = `<title id="t">${a11yTitle}</title><desc id="d">${escapeXml(a11yDesc)}</desc>`;
  body += text(TITLE_X, 38, title, `font:600 ${fitted.size}px ${FONT};fill:${C.title}`);
  body += `<circle cx="440" cy="42" r="26" fill="none" stroke="${C.ring}" stroke-width="5" opacity="${C.ringTrack}"/>`;
  body += `<circle cx="440" cy="42" r="26" fill="none" stroke="${C.ring}" stroke-width="5" stroke-linecap="round" opacity="${C.ringArc}" stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="${(CIRCUMFERENCE * percentile) / 100}" transform="rotate(-90 440 42)"/>`;
  body += `<text x="440" y="42" text-anchor="middle" dominant-baseline="central" style="font:800 17px ${FONT};fill:${C.grade}">${escapeXml(s.level)}</text>`;

  ["PUBLIC", "PRIVATE", "TOTAL"].forEach((h, i) => {
    body += text(COLS[i], HEADER_Y, h, `font:600 10.5px ${FONT};fill:${C.faint};letter-spacing:.08em`, "end");
  });
  body += `<line x1="25" y1="${HEADER_Y + 10}" x2="470" y2="${HEADER_Y + 10}" stroke="${C.rule}"/>`;

  rows.forEach((r, i) => {
    const y = HEADER_Y + 10 + ROW_GAP * (i + 1) - 4;
    const cell = `font:400 14px ${FONT};fill:${C.text}`;
    body += icon(r.icon, 25, y - 12.5, 16, C.icon);
    body += text(50, y, r.label, `font:600 14px ${FONT};fill:${C.text}`);
    body += text(COLS[0], y, formatCount(r.pub), cell, "end");
    body += text(COLS[1], y, "noPrivate" in r ? "—" : formatCount(privateCount(r.total, r.pub)), cell, "end");
    body += text(COLS[2], y, formatCount(r.total), `font:700 14px ${FONT};fill:${C.title}`, "end");
  });

  body += `<line x1="25" y1="250" x2="470" y2="250" stroke="${C.rule}"/>`;
  body += icon("lock", 25, 261.5, 12, C.muted);
  body += text(42, 272, `${FOOTER_PREFIX}${updated}`, `font:400 11.5px ${FONT};fill:${C.muted}`);

  return frame(C.background, "t d", body);
}
