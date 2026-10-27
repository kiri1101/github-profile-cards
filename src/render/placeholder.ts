import { CARD_HEIGHT, CARD_WIDTH, frame } from "./frame.ts";
import type { Theme } from "./measure.ts";
import { FONT, STATS_PALETTE } from "./palette.ts";

/** Neutral card served before the first successful refresh: never zeros. */
export function renderPlaceholder(theme: Theme): string {
  const C = STATS_PALETTE[theme];
  return frame(
    C.background,
    "t",
    `<title id="t">GitHub stats are updating</title><text x="${CARD_WIDTH / 2}" y="${CARD_HEIGHT / 2}" text-anchor="middle" dominant-baseline="central" style="font:400 14px ${FONT};fill:${C.muted}">GitHub stats are updating</text>`,
  );
}
