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
  if (Number.isNaN(d.getTime())) throw new Error("formatUpdated: invalid Date");
  const parts = new Map(DOUALA.formatToParts(d).map((p) => [p.type, p.value]));
  const day = Number(parts.get("day"));
  const month = Number(parts.get("month"));
  const year = Number(parts.get("year"));
  if (!day || !year || !MONTHS[month - 1]) throw new Error("formatUpdated: could not read date parts");
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}
