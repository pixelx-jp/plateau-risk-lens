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

  it("strips +confidence suffix from each entry", () => {
    // Real plateau-core data: coverage_source_ids may embed the confidence
    // value as a `+suffix` per entry.
    expect(
      parseSourceIds(
        "plateau-13113-shibuya-ku-2023-fld+inundation_bounded",
      ),
    ).toEqual(["plateau-13113-shibuya-ku-2023-fld"]);
    expect(
      parseSourceIds(
        "plateau-13113-shibuya-ku-2023-fld+inundation_bounded,plateau-13113-shibuya-ku-2023-fld2+explicit_polygon",
      ),
    ).toEqual([
      "plateau-13113-shibuya-ku-2023-fld",
      "plateau-13113-shibuya-ku-2023-fld2",
    ]);
  });
});
