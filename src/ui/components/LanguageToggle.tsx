import { useAppStore } from "@/app/store/useAppStore";

export function LanguageToggle() {
  const locale = useAppStore((s) => s.locale);
  const set = useAppStore((s) => s.setLocale);
  return (
    <div role="group" aria-label="Language" style={{ display: "flex", gap: 4 }}>
      {(["en", "ja"] as const).map((code) => (
        <button
          key={code}
          onClick={() => set(code)}
          aria-pressed={locale === code}
          style={{
            padding: "2px 8px",
            background: locale === code ? "#212121" : "transparent",
            color: locale === code ? "#fff" : "#212121",
            border: "1px solid #212121",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
