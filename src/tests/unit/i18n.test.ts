import { describe, expect, it } from "vitest";
import { I18n } from "@/i18n/I18n";

describe("I18n", () => {
  it("returns English strings for en locale", () => {
    const i = new I18n("en");
    expect(i.t("hazard.river_flood")).toBe("River flood");
    expect(i.t("status.no_data")).toBe("No data");
  });

  it("returns Japanese strings for ja locale", () => {
    const i = new I18n("ja");
    expect(i.t("hazard.river_flood")).toBe("河川洪水");
    expect(i.t("status.no_data")).toBe("データなし");
  });

  it("interpolates parameters", () => {
    const i = new I18n("en");
    expect(i.t("status.risk_depth", { depth: 2.5 })).toBe("Max depth 2.5 m");
    expect(new I18n("ja").t("status.risk_depth", { depth: 1 })).toBe(
      "最大浸水深 1 m",
    );
  });

  it("hazardLabel delegates to t()", () => {
    expect(new I18n("en").hazardLabel("tsunami")).toBe("Tsunami");
    expect(new I18n("ja").hazardLabel("tsunami")).toBe("津波");
  });

  it("statusLabel formats depth for risk_depth", () => {
    const i = new I18n("en");
    expect(i.statusLabel("risk_depth", 3.456)).toBe("Max depth 3.5 m");
    expect(i.statusLabel("safe", null)).toBe("Covered, not in hazard zone");
    expect(i.statusLabel("no_data", null)).toBe("No data");
    expect(i.statusLabel("low_confidence", null)).toBe("Coverage unknown");
    expect(i.statusLabel("risk_zone", null)).toBe("Inside hazard zone");
  });

  it("statusLabel handles null depth for risk_depth gracefully", () => {
    expect(new I18n("en").statusLabel("risk_depth", null)).toBe("Max depth ? m");
  });
});
