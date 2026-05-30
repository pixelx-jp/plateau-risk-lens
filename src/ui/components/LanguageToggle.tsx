import { useAppStore } from "@/app/store/useAppStore";
import { MOBILE_QUERY, useMediaQuery } from "@/utils/useMediaQuery";

export function LanguageToggle() {
  const locale = useAppStore((s) => s.locale);
  const set = useAppStore((s) => s.setLocale);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  return (
    <div role="group" aria-label="Language" style={{ display: "flex", gap: 4 }}>
      {(["en", "ja"] as const).map((code) => (
        <button
          key={code}
          onClick={() => set(code)}
          aria-pressed={locale === code}
          style={{
            padding: isMobile ? "0 14px" : "2px 8px",
            minHeight: isMobile ? 44 : undefined,
            background: locale === code ? "#212121" : "transparent",
            color: locale === code ? "#fff" : "#212121",
            border: "1px solid #212121",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: isMobile ? 14 : 12,
          }}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
