import { describe, expect, it } from "vitest";
import { parseSourceIds } from "@/manifest/sourceIdParser";

describe("parseSourceIds", () => {
  it("returns [] for non-strings and empty input", () => {
    expect(parseSourceIds(undefined)).toEqual([]);
    expect(parseSourceIds(null)).toEqual([]);
    expect(parseSourceIds("")).toEqual([]);
    expect(parseSourceIds("   ")).toEqual([]);
  });

  it("splits on comma (pipeline canonical)", () => {
    expect(parseSourceIds("src1,src2,src3")).toEqual(["src1", "src2", "src3"]);
  });

  it("tolerates pipe and whitespace", () => {
    expect(parseSourceIds("src1 | src2")).toEqual(["src1", "src2"]);
  });

  it("drops empty segments", () => {
    expect(parseSourceIds("src1,,src2,")).toEqual(["src1", "src2"]);
  });
});
