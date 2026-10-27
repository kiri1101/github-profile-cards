const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ENTITIES[c]);
}
