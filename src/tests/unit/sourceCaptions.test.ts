import { describe, expect, it } from "vitest";
import { captionForSource, parseDatasetId } from "@/i18n/captions/sourceCaptions";

describe("parseDatasetId", () => {
  it("parses canonical PLATEAU dataset_id", () => {
    expect(parseDatasetId("plateau-13113-shibuya-ku-2023-fld")).toEqual({
      cityCode: "13113",
      cityName: "shibuya-ku",
      year: 2023,
      suffix: "fld",
    });
  });

  it("handles city names with multiple hyphens", () => {
    expect(parseDatasetId("plateau-14204-kamakura-shi-2024-tnm")).toMatchObject({
      cityCode: "14204",
      cityName: "kamakura-shi",
      year: 2024,
      suffix: "tnm",
    });
  });

  it("returns nulls for unrecognized formats", () => {
    expect(parseDatasetId("garbage")).toEqual({
      cityCode: null,
      cityName: null,
      year: null,
      suffix: null,
    });
  });
});

describe("captionForSource", () => {
  it("uses explicit title when present (level 1)", () => {
    const caption = captionForSource(
      {
        dataset_id: "plateau-13113-shibuya-ku-2023-fld",
        year: 2023,
        title: { en: "Custom Title" },
      },
      "en",
    );
    expect(caption).toBe("Custom Title (2023)");
  });

  it("falls back to suffix table when title is absent (level 2)", () => {
    expect(
      captionForSource(
        { dataset_id: "plateau-13113-shibuya-ku-2023-fld", year: 2023, title: {} },
        "en",
      ),
    ).toBe("Flood inundation assumption map (2023)");
    expect(
      captionForSource(
        { dataset_id: "plateau-13113-shibuya-ku-2023-tnm", year: 2023, title: {} },
        "ja",
      ),
    ).toBe("津波浸水想定区域図 (2023)");
  });

  it("returns null for unknown suffixes (caller falls back to dataset_id)", () => {
    expect(
      captionForSource(
        { dataset_id: "plateau-13113-shibuya-ku-2023-xyz", year: 2023, title: {} },
        "en",
      ),
    ).toBeNull();
  });
});
