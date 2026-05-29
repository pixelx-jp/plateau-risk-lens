import { en, type MessageKey } from "./locales/en";
import { ja } from "./locales/ja";
import type { Locale } from "./types";
import type { HazardKey, HazardStatusKind } from "@/types/hazard";

const TABLES: Record<Locale, Record<MessageKey, string>> = {
  en,
  ja,
};

export class I18n {
  constructor(public locale: Locale) {}

  setLocale(locale: Locale) {
    this.locale = locale;
  }

  t(key: MessageKey, params?: Record<string, string | number>): string {
    const raw = TABLES[this.locale][key] ?? TABLES.en[key] ?? key;
    if (!params) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, k: string) =>
      params[k] !== undefined ? String(params[k]) : `{${k}}`,
    );
  }

  hazardLabel(key: HazardKey): string {
    return this.t(`hazard.${key}` as MessageKey);
  }

  statusLabel(kind: HazardStatusKind, depth: number | null): string {
    switch (kind) {
      case "no_data":
        return this.t("status.no_data");
      case "low_confidence":
        return this.t("status.low_confidence");
      case "safe":
        return this.t("status.safe");
      case "risk_zone":
        return this.t("status.risk_zone");
      case "risk_depth":
        return this.t("status.risk_depth", {
          depth: depth !== null ? depth.toFixed(1) : "?",
        });
    }
  }
}
