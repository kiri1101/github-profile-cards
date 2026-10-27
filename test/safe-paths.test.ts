import { describe, expect, it } from "vitest";
import { cleanupTargets } from "../scripts/safe-paths.ts";

describe("cleanupTargets", () => {
  const root = "/repo/public";
  it("treats URL-looking names as plain file names inside the root", () => {
    for (const name of ["%2e%2e", ".%2e", "a#b", "a?b", "normal.svg"]) {
      expect(cleanupTargets(root, [name], [".gitkeep"], "/")).toEqual([`/repo/public/${name}`]);
    }
  });
  it("skips kept entries", () => {
    expect(cleanupTargets(root, [".gitkeep", "x"], [".gitkeep"], "/")).toEqual(["/repo/public/x"]);
  });
  it("rejects traversal and separators", () => {
    for (const name of ["..", ".", "a/b", "a" + String.fromCharCode(92) + "b", ""]) {
      expect(() => cleanupTargets(root, [name], [".gitkeep"], "/")).toThrow();
    }
  });
});
