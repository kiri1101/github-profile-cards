export const FOOTER_PREFIX = "Private = private repositories, mostly client work · updated ";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DOUALA = new Intl.DateTimeFormat("en-US", {
  timeZone: "Africa/Douala",
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

/** "27 Oct 2026" in the Africa/Douala time zone, with a fixed English month list. */
export function formatUpdated(d: Date): string {
  const part = (type: string) => Number(DOUALA.formatToParts(d).find((p) => p.type === type)?.value);
  return `${part("day")} ${MONTHS[part("month") - 1]} ${part("year")}`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}
