import { describe, expect, it } from "vitest";
import { measure } from "../src/render/measure.ts";
import { escapeXml } from "../src/render/escape.ts";
import { formatCount, formatUpdated } from "../src/render/format.ts";

describe("measure", () => {
  it("is zero for empty text", () => {
    expect(measure("", 12, 400)).toBe(0);
  });
  it("is additive per character", () => {
    expect(measure("MM", 10, 400)).toBeCloseTo(2 * measure("M", 10, 400), 10);
  });
  it("scales linearly with size", () => {
    expect(measure("Lead developer", 24, 400)).toBeCloseTo(2 * measure("Lead developer", 12, 400), 10);
  });
  it("weight 500 is the mean of 400 and 600", () => {
    expect(measure("Hello", 14, 500)).toBeCloseTo((measure("Hello", 14, 400) + measure("Hello", 14, 600)) / 2, 10);
  });
  it("measures an unknown character as 0.6 x size", () => {
    expect(measure("中", 10, 400)).toBeCloseTo(6, 10);
  });
});

describe("escapeXml", () => {
  it("escapes & < > \" and '", () => {
    expect(escapeXml("A & B <C> \"d\" 'e'")).toBe("A &amp; B &lt;C&gt; &quot;d&quot; &#39;e&#39;");
  });
});

describe("formatUpdated", () => {
  it("formats a daytime UTC instant", () => {
    expect(formatUpdated(new Date("2026-10-27T10:00:00Z"))).toBe("27 Oct 2026");
  });
  it("uses the Douala date across the UTC day boundary", () => {
    expect(formatUpdated(new Date("2026-10-27T23:30:00Z"))).toBe("28 Oct 2026");
  });
  it("uses a fixed English month name and no zero padding", () => {
    expect(formatUpdated(new Date("2026-09-05T12:00:00Z"))).toBe("5 Sep 2026");
  });
});

describe("formatCount", () => {
  it("groups thousands en-US", () => {
    expect(formatCount(1383)).toBe("1,383");
    expect(formatCount(49)).toBe("49");
  });
});
