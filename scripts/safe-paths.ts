/**
 * Maps directory entry names to absolute paths directly inside `root`, skipping `keep`.
 * Entry names are used as plain file names (never parsed as URLs); anything that could
 * resolve outside `root` is rejected.
 */
export function cleanupTargets(root: string, entries: string[], keep: string[], sep: string): string[] {
  const base = root.endsWith(sep) ? root : root + sep;
  const out: string[] = [];
  for (const entry of entries) {
    if (keep.includes(entry)) continue;
    if (entry === "" || entry === "." || entry === ".." || entry.includes("/") || entry.includes("\\") || entry.includes("\0")) {
      throw new Error(`refusing to clean unsafe entry name: ${JSON.stringify(entry)}`);
    }
    out.push(base + entry);
  }
  return out;
}
