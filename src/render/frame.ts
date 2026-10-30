export const CARD_WIDTH = 495;
export const CARD_HEIGHT = 290;

/** The shared outer <svg> and background rect for the cards and their placeholders. Defaults to the stats card size. */
export function frame(
  background: string,
  labelledBy: string,
  content: string,
  size: { width: number; height: number } = { width: CARD_WIDTH, height: CARD_HEIGHT },
): string {
  const { width, height } = size;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${labelledBy}"><rect x="0.5" y="0.5" rx="4.5" width="${width - 1}" height="${height - 1}" fill="${background}"/>${content}</svg>`;
}
