import { describe, expect, it } from "vitest";
import { evaluateVisibility } from "../src/github/token-checks.ts";

const ok = { commitsTotal: 10, commitsPublic: 5, prsTotal: 4, prsPublic: 2, issuesTotal: 3, issuesPublic: 1 };

describe("evaluateVisibility", () => {
  it("passes when totals exceed public counts and private repos exist", () => {
    expect(evaluateVisibility(ok, 3)).toEqual([]);
  });

  it("reports every failing check, not just the first", () => {
    const failures = evaluateVisibility({ ...ok, commitsTotal: 5, prsTotal: 2, issuesTotal: 1 }, 0);
    expect(failures).toHaveLength(4);
    expect(failures.join("\n")).toContain("commitsTotal");
    expect(failures.join("\n")).toContain("private repositories");
  });

  it("hints at Contents: read-only for PR or issue failures only", () => {
    expect(evaluateVisibility({ ...ok, prsTotal: 2 }, 1).join("\n")).toContain("Contents: read-only");
    expect(evaluateVisibility({ ...ok, commitsTotal: 5 }, 1).join("\n")).not.toContain("Contents: read-only");
  });
});
