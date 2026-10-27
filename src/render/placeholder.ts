import type { Theme } from "./measure.ts";
import { FONT, STATS_PALETTE } from "./palette.ts";

/** Neutral card served before the first successful refresh: never zeros. */
export function renderPlaceholder(theme: Theme): string {
  const C = STATS_PALETTE[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="495" height="290" viewBox="0 0 495 290" role="img" aria-labelledby="t"><title id="t">GitHub stats are updating</title><rect x="0.5" y="0.5" rx="4.5" width="494" height="289" fill="${C.background}"/><text x="247.5" y="145" text-anchor="middle" dominant-baseline="central" style="font:400 14px ${FONT};fill:${C.muted}">GitHub stats are updating</text></svg>`;
}
