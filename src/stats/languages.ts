import type { LanguageTotal } from "../github/languages.ts";

export type LangEntry = { name: string; color: string; percent: number };
export type LangSnapshot = { top: LangEntry[]; fetchedAt: string };

export const FALLBACK_COLOR = "#8b949e";
const TOP = 6;

/** Top 6 by bytes; percentages are shares of those six, each rounded individually to 2 decimals (the six may total 99.99 to 100.01). */
export function buildLangSnapshot(totals: LanguageTotal[], fetchedAt: Date): LangSnapshot {
  const top = [...totals].sort((a, b) => b.bytes - a.bytes).slice(0, TOP);
  const sum = top.reduce((a, t) => a + t.bytes, 0);
  return {
    top: top.map((t) => ({
      name: t.name,
      color: t.color ?? FALLBACK_COLOR,
      percent: sum > 0 ? Math.round((t.bytes * 10000) / sum) / 100 : 0,
    })),
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
