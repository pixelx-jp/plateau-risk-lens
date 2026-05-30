import { useCallback } from "react";
import type { I18n } from "@/i18n/I18n";
import type { ManifestRegistry } from "@/manifest/ManifestRegistry";
import type { MapStageHandle } from "@/map/MapStage";
import { downloadBlob } from "@/utils/download";
import { useAppStore } from "@/app/store/useAppStore";
import { MOBILE_QUERY, useMediaQuery } from "@/utils/useMediaQuery";

interface Props {
  i18n: I18n;
  manifest: ManifestRegistry;
  mapRef: React.RefObject<MapStageHandle | null>;
  fgbDirectoryUrl: string;
}

export function ExportToolbar({ i18n, manifest, mapRef, fgbDirectoryUrl }: Props) {
  const activeHazards = useAppStore((s) => s.activeHazards);
  const setExportStatus = useAppStore((s) => s.setExportStatus);
  const exportStatus = useAppStore((s) => s.exportStatus);
  const isMobile = useMediaQuery(MOBILE_QUERY);

  const onPng = useCallback(async () => {
    const stage = mapRef.current;
    if (!stage) return;
    const canvas = stage.getCanvas();
    if (!canvas) return;
    setExportStatus({ kind: "running", label: i18n.t("controls.export_png") });
    try {
      await stage.waitForIdle();
      const [{ ScreenshotComposer }, { buildOverlayModel }] = await Promise.all([
        import("@/export/ScreenshotComposer"),
        import("@/export/buildOverlay"),
      ]);
      const composer = new ScreenshotComposer();
      const overlay = buildOverlayModel({
        activeHazards,
        i18n,
        manifest,
        now: new Date(),
      });
      const blob = await composer.compose({
        mapCanvas: canvas,
        pixelRatio: window.devicePixelRatio || 1,
        locale: i18n.locale,
        activeHazards,
        cityName: manifest.cityName,
        cityCode: manifest.cityCode,
        datasetYear: manifest.datasetYear,
        overlay,
      });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(
        blob,
        `plateau-risk-lens-${manifest.cityCode}-${stamp}.png`,
      );
      setExportStatus({ kind: "done", label: "PNG" });
    } catch (err) {
      setExportStatus({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [activeHazards, i18n, manifest, mapRef, setExportStatus]);

  const onGeoJson = useCallback(async () => {
    const stage = mapRef.current;
    if (!stage) return;
    const bbox = stage.getViewportBbox();
    if (!bbox) return;
    setExportStatus({ kind: "running", label: i18n.t("controls.export_geojson") });
    try {
      const { FgbExporter } = await import("@/export/FgbExporter");
      const exporter = new FgbExporter(manifest, fgbDirectoryUrl);
      const result = await exporter.exportBbox({
        bbox,
        selectedHazards: activeHazards,
      });
      downloadBlob(result.blob, result.filename);
      setExportStatus({
        kind: "done",
        label: `${result.featureCount} buildings`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setExportStatus({ kind: "error", message });
    }
  }, [activeHazards, fgbDirectoryUrl, i18n, manifest, mapRef, setExportStatus]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button onClick={onPng} style={isMobile ? mobileButtonStyle : buttonStyle}>
        {i18n.t("controls.export_png")}
      </button>
      <button onClick={onGeoJson} style={isMobile ? mobileButtonStyle : buttonStyle}>
        {i18n.t("controls.export_geojson")}
      </button>
      <ExportStatusLine status={exportStatus} />
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "6px 10px",
  background: "#212121",
  color: "#fff",
  border: 0,
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 12,
};

const mobileButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  minHeight: 44,
  fontSize: 15,
};

function ExportStatusLine({
  status,
}: {
  status: ReturnType<typeof useAppStore.getState>["exportStatus"];
}) {
  if (status.kind === "idle") return null;
  if (status.kind === "running") {
    return (
      <span style={{ fontSize: 11, color: "#666" }}>… {status.label}</span>
    );
  }
  if (status.kind === "done") {
    return (
      <span style={{ fontSize: 11, color: "#2E7D32" }}>✓ {status.label}</span>
    );
  }
  return (
    <span
      style={{
        fontSize: 11,
        color: "#B71C1C",
        wordBreak: "break-word",
        whiteSpace: "normal",
      }}
    >
      ⚠ {status.message}
    </span>
  );
}
