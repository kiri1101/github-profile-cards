import type { Snapshot } from "../stats/snapshot.ts";
import { escapeXml } from "./escape.ts";
import { FOOTER_PREFIX, formatCount, formatUpdated } from "./format.ts";
import type { Theme } from "./measure.ts";
import { OCTICONS } from "./octicons.ts";
import { FONT, STATS_PALETTE } from "./palette.ts";

const COLS = [330, 400, 470] as const;
const HEADER_Y = 100;
const ROW_GAP = 31;
const CIRCUMFERENCE = 2 * Math.PI * 26;

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

  const title = `${escapeXml(s.name)}&#39;s GitHub Stats`;
  const updated = formatUpdated(new Date(s.fetchedAt));
  const summary = rows
    .map((r) => {
      const priv = "noPrivate" in r ? "" : `, ${formatCount(r.total - r.pub)} private`;
      return `${r.label}: ${formatCount(r.total)} total (${formatCount(r.pub)} public${priv})`;
    })
    .join(". ");
  const a11yTitle = `${title}, Rank: ${s.level}`;
  const a11yDesc = `${summary}. Private = private repositories, mostly client work. Updated ${updated}.`;

  let body = `<title id="t">${a11yTitle}</title><desc id="d">${escapeXml(a11yDesc)}</desc>`;
  body += text(25, 38, title, `font:600 18px ${FONT};fill:${C.title}`);
  body += `<circle cx="440" cy="42" r="26" fill="none" stroke="${C.ring}" stroke-width="5" opacity="${C.ringTrack}"/>`;
  body += `<circle cx="440" cy="42" r="26" fill="none" stroke="${C.ring}" stroke-width="5" stroke-linecap="round" opacity="${C.ringArc}" stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="${(CIRCUMFERENCE * s.percentile) / 100}" transform="rotate(-90 440 42)"/>`;
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
    body += text(COLS[1], y, "noPrivate" in r ? "—" : formatCount(r.total - r.pub), cell, "end");
    body += text(COLS[2], y, formatCount(r.total), `font:700 14px ${FONT};fill:${C.title}`, "end");
  });

  body += `<line x1="25" y1="250" x2="470" y2="250" stroke="${C.rule}"/>`;
  body += icon("lock", 25, 261.5, 12, C.muted);
  body += text(42, 272, `${FOOTER_PREFIX}${updated}`, `font:400 11.5px ${FONT};fill:${C.muted}`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="495" height="290" viewBox="0 0 495 290" role="img" aria-labelledby="t d"><rect x="0.5" y="0.5" rx="4.5" width="494" height="289" fill="${C.background}"/>${body}</svg>`;
}
