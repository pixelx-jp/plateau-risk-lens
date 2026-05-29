import type { FeatureProps } from "@/types/feature";
import type { I18n } from "@/i18n/I18n";
import type { ManifestRegistry } from "@/manifest/ManifestRegistry";
import { buildPropertyCard, type PropertyCardViewModel } from "@/map/interaction/FeaturePicker";
import { HAZARD_KEYS } from "@/types/hazard";
import { toHazardStatus } from "@/hazard/hazardClassification";
import { useMemo } from "react";

interface Props {
  feature: FeatureProps;
  manifest: ManifestRegistry;
  i18n: I18n;
  isMobile?: boolean;
  onClose(): void;
}

function fmt(value: unknown, i18n: I18n): string {
  if (value === null || value === undefined || value === "") return i18n.t("card.unknown");
  return String(value);
}

function isWoodenPre1981(props: FeatureProps): boolean {
  const s = (props.structure ?? "").toString();
  const y = props.year_built;
  if (typeof y !== "number" || !Number.isFinite(y) || y <= 0) return false;
  return y < 1981 && /^wood|wooden$|^W$|木造/.test(s);
}

export function PropertyCard({ feature, manifest, i18n, isMobile = false, onClose }: Props) {
  const view = useMemo<PropertyCardViewModel>(() => {
    const hazards = HAZARD_KEYS.map((k) => toHazardStatus(feature, k));
    return buildPropertyCard({ props: feature, hazards }, manifest);
  }, [feature, manifest]);

  const mobileStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "60vh",
    overflowY: "auto",
    background: "rgba(255, 255, 255, 0.98)",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
    boxShadow: "0 -2px 12px rgba(0, 0, 0, 0.18)",
    fontFamily: "system-ui, sans-serif",
    fontSize: 14,
    lineHeight: 1.5,
    zIndex: 10,
  };
  const desktopStyle: React.CSSProperties = {
    position: "absolute",
    right: 12,
    top: 12,
    width: 320,
    maxHeight: "calc(100vh - 24px)",
    overflowY: "auto",
    background: "rgba(255, 255, 255, 0.98)",
    borderRadius: 8,
    padding: 16,
    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.15)",
    fontFamily: "system-ui, sans-serif",
    fontSize: 13,
    lineHeight: 1.5,
    zIndex: 10,
  };

  return (
    <aside style={isMobile ? mobileStyle : desktopStyle}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: 12, color: "#666" }}>
          {view.buildingUid}
        </strong>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: "transparent",
            border: 0,
            cursor: "pointer",
            fontSize: 18,
            color: "#888",
          }}
        >
          ×
        </button>
      </header>

      {isWoodenPre1981(feature) && (
        <div
          style={{
            margin: "8px 0",
            padding: "4px 8px",
            background: "#FFEBEE",
            color: "#B71C1C",
            borderRadius: 4,
            fontWeight: 600,
          }}
        >
          {i18n.t("card.wooden_pre1981")}
        </div>
      )}

      <table style={{ width: "100%", marginTop: 8 }}>
        <tbody>
          <Row label={i18n.t("card.year_built")} value={fmt(feature.year_built, i18n)} />
          <Row label={i18n.t("card.structure")} value={fmt(feature.structure, i18n)} />
          <Row label={i18n.t("card.usage")} value={fmt(feature.usage, i18n)} />
          <Row
            label={i18n.t("card.floors")}
            value={fmt(feature.floors ?? feature.floors_above, i18n)}
          />
          <Row
            label={i18n.t("card.fireproof")}
            value={fmt(feature.fireproof_type ?? feature.fire_resistance, i18n)}
          />
        </tbody>
      </table>

      <h4 style={{ marginTop: 16, marginBottom: 4 }}>Hazard status</h4>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {view.hazards.map((h) => (
          <li
            key={h.key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "3px 0",
              borderBottom: "1px solid #EEE",
            }}
          >
            <span>
              {(h.kind === "low_confidence" || h.kind === "no_data") && (
                <span
                  aria-label={i18n.statusLabel(h.kind, h.depthMax)}
                  title={i18n.statusLabel(h.kind, h.depthMax)}
                  style={{
                    display: "inline-block",
                    marginRight: 6,
                    color: "#F57C00",
                    fontWeight: 700,
                  }}
                >
                  ⚠
                </span>
              )}
              {i18n.hazardLabel(h.key)}
            </span>
            <span style={{ color: statusColor(h.kind) }}>
              {i18n.statusLabel(h.kind, h.depthMax)}
            </span>
          </li>
        ))}
      </ul>

      <SourceSection
        title={i18n.t("card.sources_coverage")}
        entries={view.coverageSources}
        i18n={i18n}
        manifest={manifest}
      />
      <SourceSection
        title={i18n.t("card.sources_hit")}
        entries={view.hitSources}
        i18n={i18n}
        manifest={manifest}
      />
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ color: "#666", paddingRight: 8, verticalAlign: "top" }}>{label}</td>
      <td style={{ fontWeight: 500 }}>{value}</td>
    </tr>
  );
}

function statusColor(kind: string): string {
  switch (kind) {
    case "no_data":
      return "#616161";
    case "low_confidence":
      return "#9E9E9E";
    case "safe":
      return "#2E7D32";
    case "risk_depth":
      return "#E53935";
    case "risk_zone":
      return "#6A1B9A";
    default:
      return "inherit";
  }
}

function SourceSection({
  title,
  entries,
  i18n,
  manifest,
}: {
  title: string;
  entries: { source_id: string; dataset_id: string; year?: number; url?: string; publisher?: string }[];
  i18n: I18n;
  manifest: ManifestRegistry;
}) {
  return (
    <section style={{ marginTop: 12 }}>
      <h4 style={{ marginBottom: 4 }}>{title}</h4>
      {entries.length === 0 ? (
        <p style={{ color: "#999", margin: 0 }}>{i18n.t("card.no_sources")}</p>
      ) : (
        <ul style={{ paddingLeft: 16, margin: 0 }}>
          {entries.map((entry) => (
            <li key={entry.source_id} style={{ marginBottom: 4 }}>
              <div>
                {entry.url ? (
                  <a href={entry.url} target="_blank" rel="noreferrer">
                    {manifest.datasetCaption(entry, i18n.locale)}
                  </a>
                ) : (
                  manifest.datasetCaption(entry, i18n.locale)
                )}
              </div>
              {/* Plan requires citable exports to expose dataset_id and year
                  alongside the localized caption so readers can verify the
                  exact PLATEAU resource. */}
              <div
                style={{
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 10,
                  color: "#888",
                  wordBreak: "break-all",
                }}
              >
                {entry.dataset_id}
                {entry.year ? ` · ${entry.year}` : ""}
                {entry.publisher ? ` · ${entry.publisher}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
