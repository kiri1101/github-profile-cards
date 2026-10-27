export const CARD_WIDTH = 495;
export const CARD_HEIGHT = 290;

/** The shared outer <svg> and background rect for the stats card and its placeholder. */
export function frame(background: string, labelledBy: string, content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img" aria-labelledby="${labelledBy}"><rect x="0.5" y="0.5" rx="4.5" width="${CARD_WIDTH - 1}" height="${CARD_HEIGHT - 1}" fill="${background}"/>${content}</svg>`;
}
