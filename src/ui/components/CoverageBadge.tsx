import { useEffect, useMemo, useState } from "react";
import type { I18n } from "@/i18n/I18n";
import type { ManifestRegistry } from "@/manifest/ManifestRegistry";
import type { MapStageHandle } from "@/map/MapStage";
import { CoverageMeter, type ViewportCoverageSnapshot } from "@/coverage/CoverageMeter";
import { useAppStore } from "@/app/store/useAppStore";

interface Props {
  i18n: I18n;
  manifest: ManifestRegistry;
  mapRef: React.RefObject<MapStageHandle | null>;
}

export function CoverageBadge({ i18n, manifest, mapRef }: Props) {
  const activeHazards = useAppStore((s) => s.activeHazards);
  const [viewport, setViewport] = useState<ViewportCoverageSnapshot | null>(null);

  useEffect(() => {
    let pending: number | null = null;
    const sample = () => {
      const stage = mapRef.current;
      const map = stage?.getMap();
      if (!stage || !map) return;
      const meter = new CoverageMeter(map, manifest);
      const ids = stage.getBuildingLayerIds();
      setViewport(meter.getViewportCoverage(ids));
    };
    const debounced = () => {
      if (pending !== null) cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        pending = null;
        sample();
      });
    };
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.on("idle", debounced);
    map.on("moveend", debounced);
    sample();
    return () => {
      map.off("idle", debounced);
      map.off("moveend", debounced);
      if (pending !== null) cancelAnimationFrame(pending);
    };
  }, [activeHazards, manifest, mapRef]);

  const city = useMemo(() => {
    const fields = manifest.manifest.field_coverage ?? {};
    return {
      yearBuilt: fields.year_built,
      structure: fields.structure,
    };
  }, [manifest]);

  return (
    <div
      style={{
        position: "absolute",
        right: 12,
        bottom: 12,
        padding: "8px 10px",
        background: "rgba(255,255,255,0.94)",
        borderRadius: 6,
        fontSize: 11,
        lineHeight: 1.5,
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        minWidth: 200,
      }}
    >
      <strong style={{ display: "block", fontSize: 11, color: "#333" }}>
        {i18n.t("coverage.city")}
      </strong>
      <div>
        {i18n.t("coverage.buildings")}: {manifest.nBuildings.toLocaleString()}
      </div>
      {typeof city.yearBuilt === "number" && (
        <div>
          {i18n.t("coverage.year_known")}: {(city.yearBuilt * 100).toFixed(0)}%
        </div>
      )}
      {typeof city.structure === "number" && (
        <div>
          {i18n.t("coverage.structure_known")}: {(city.structure * 100).toFixed(0)}%
        </div>
      )}

      <hr style={{ border: 0, borderTop: "1px solid #DDD", margin: "6px 0" }} />

      <strong style={{ display: "block", fontSize: 11, color: "#333" }}>
        {i18n.t("coverage.viewport")}
      </strong>
      <div>
        {i18n.t("coverage.buildings")}: {viewport?.buildings.toLocaleString() ?? "—"}
      </div>
      {viewport && (
        <>
          <div>
            {i18n.t("coverage.year_known")}: {viewport.yearKnown.toLocaleString()}
          </div>
          <div>
            {i18n.t("coverage.structure_known")}: {viewport.structureKnown.toLocaleString()}
          </div>
          {activeHazards.map((key) => {
            const v = viewport.perHazard[key];
            return (
              <div key={key} style={{ marginTop: 2 }}>
                <em style={{ color: "#555" }}>{i18n.hazardLabel(key)}</em>:{" "}
                <span style={{ color: "#2E7D32" }}>{v.covered}</span>
                {" / "}
                <span style={{ color: "#616161" }}>{v.noData} no-data</span>
                {v.lowConfidence > 0 && (
                  <>
                    {" / "}
                    <span style={{ color: "#9E9E9E" }}>{v.lowConfidence} ?</span>
                  </>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
