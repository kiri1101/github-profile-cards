import type { LanguageTotal } from "../github/languages.ts";

export type LangEntry = { name: string; color: string; percent: number };
export type LangSnapshot = { top: LangEntry[]; fetchedAt: string };

export const FALLBACK_COLOR = "#8b949e";
const TOP = 6;

/** Top 6 by bytes; percentages are shares of those six, rounded to 2 decimals by largest remainder so they add up to exactly 100. */
export function buildLangSnapshot(totals: LanguageTotal[], fetchedAt: Date): LangSnapshot {
  const top = [...totals].sort((a, b) => b.bytes - a.bytes).slice(0, TOP);
  const sum = top.reduce((a, t) => a + t.bytes, 0);
  const exact = top.map((t) => (sum > 0 ? (t.bytes / sum) * 10000 : 0));
  const hundredths = exact.map(Math.floor);
  let left = sum > 0 ? 10000 - hundredths.reduce((a, n) => a + n, 0) : 0;
  const order = exact.map((v, i) => ({ i, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    hundredths[i] += 1;
    left -= 1;
  }
  return {
    top: top.map((t, i) => ({ name: t.name, color: t.color ?? FALLBACK_COLOR, percent: hundredths[i] / 100 })),
    fetchedAt: fetchedAt.toISOString(),
  };
}

export function validateLangTotals(totals: LanguageTotal[]): { ok: true } | { ok: false; reason: string } {
  if (totals.length === 0) return { ok: false, reason: "no languages found" };
  let sum = 0;
  for (const t of totals) {
    if (typeof t.name !== "string" || t.name.trim() === "") return { ok: false, reason: "language with an empty name" };
    if (!Number.isInteger(t.bytes) || t.bytes < 0) return { ok: false, reason: `invalid byte count for ${t.name}` };
    sum += t.bytes;
  }
  if (sum <= 0) return { ok: false, reason: "total bytes is zero" };
  return { ok: true };
}
