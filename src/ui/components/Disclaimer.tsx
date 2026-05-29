import type { I18n } from "@/i18n/I18n";
import type { ManifestRegistry } from "@/manifest/ManifestRegistry";

interface Props {
  i18n: I18n;
  manifest: ManifestRegistry;
}

export function Disclaimer({ i18n, manifest }: Props) {
  return (
    <footer
      style={{
        position: "absolute",
        left: 12,
        bottom: 12,
        padding: "6px 10px",
        background: "rgba(255, 255, 255, 0.92)",
        borderRadius: 4,
        fontSize: 11,
        color: "#333",
        maxWidth: 360,
        boxShadow: "0 1px 4px rgba(0, 0, 0, 0.12)",
      }}
    >
      <div style={{ fontWeight: 600 }}>{i18n.t("disclaimer.short")}</div>
      <div style={{ marginTop: 2 }}>
        {i18n.t("attribution")} · {manifest.cityName} · {manifest.datasetYear}
      </div>
      <div style={{ marginTop: 4, color: "#666" }}>
        {i18n.t("about.builtBy")}{" "}
        <a
          href="https://yodolabs.jp"
          target="_blank"
          rel="noreferrer"
          style={{ color: "#333" }}
        >
          Yodo Labs
        </a>
      </div>
    </footer>
  );
}
