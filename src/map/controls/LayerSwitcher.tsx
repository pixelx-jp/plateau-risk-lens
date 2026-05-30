import { HAZARD_KEYS, type HazardKey } from "@/types/hazard";
import { useAppStore } from "@/app/store/useAppStore";
import { MOBILE_QUERY, useMediaQuery } from "@/utils/useMediaQuery";
import type { ManifestRegistry } from "@/manifest/ManifestRegistry";
import type { I18n } from "@/i18n/I18n";

interface Props {
  i18n: I18n;
  manifest: ManifestRegistry;
}

/** A hazard with zero surveyed buildings for this city carries no signal —
 * toggling it on would just blank the map to no-data grey. Disable it and say
 * why, rather than letting the user discover an all-grey map. */
function hasCoverage(manifest: ManifestRegistry, key: HazardKey): boolean {
  return (manifest.getHazardStats(key)?.covered_count ?? 0) > 0;
}

export function LayerSwitcher({ i18n, manifest }: Props) {
  const active = useAppStore((s) => s.activeHazards);
  const toggle = useAppStore((s) => s.toggleHazard);
  const isMobile = useMediaQuery(MOBILE_QUERY);

  return (
    <fieldset
      style={{
        border: 0,
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <legend style={{ fontWeight: 600, marginBottom: 4 }}>
        {i18n.t("controls.layers")}
      </legend>
      {HAZARD_KEYS.map((key: HazardKey) => {
        const covered = hasCoverage(manifest, key);
        const noData = i18n.t("controls.no_survey_data");
        return (
          <label
            key={key}
            title={covered ? undefined : noData}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              minHeight: isMobile ? 44 : undefined,
              cursor: covered ? "pointer" : "not-allowed",
              opacity: covered ? 1 : 0.45,
            }}
          >
            <input
              type="checkbox"
              checked={active.includes(key)}
              disabled={!covered}
              onChange={() => toggle(key)}
              style={isMobile ? { width: 22, height: 22 } : undefined}
            />
            <span>{i18n.hazardLabel(key)}</span>
            {!covered && (
              <span style={{ fontSize: 11, color: "#888" }}>
                ({i18n.t("status.no_data")})
              </span>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}
