import metrics from "./metrics.json" with { type: "json" };

export type Theme = "light" | "dark";

type Table = Record<string, number>;
const TABLES = metrics as Record<"400" | "600" | "700", Table>;

function width(text: string, table: Table): number {
  let em = 0;
  for (const ch of text) em += table[ch] ?? 0.6;
  return em;
}

/** Width in px of `text` in Segoe UI at `sizePx`. Weight 500 is the mean of 400 and 600. Unknown characters count as 0.6em. */
export function measure(text: string, sizePx: number, weight: 400 | 500 | 600 | 700): number {
  if (weight === 500) return (measure(text, sizePx, 400) + measure(text, sizePx, 600)) / 2;
  return width(text, TABLES[weight]) * sizePx;
}
