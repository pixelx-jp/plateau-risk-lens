import { useEffect, useMemo, useRef, useState } from "react";
import { MapStage, type MapStageHandle } from "@/map/MapStage";
import { ManifestRegistry } from "@/manifest/ManifestRegistry";
import { buildArtifactPaths } from "@/map/sources/artifactUrls";
import { LayerSwitcher } from "@/map/controls/LayerSwitcher";
import { OpacitySlider } from "@/map/controls/OpacitySlider";
import { ExportToolbar } from "@/map/controls/ExportToolbar";
import { LanguageToggle } from "@/ui/components/LanguageToggle";
import { Disclaimer } from "@/ui/components/Disclaimer";
import { PropertyCard } from "@/ui/components/PropertyCard";
import { CoverageBadge } from "@/ui/components/CoverageBadge";
import { CityPicker } from "@/ui/components/CityPicker";
import { CITIES, findCity } from "./cities";
import { useAppStore } from "./store/useAppStore";
import { I18n } from "@/i18n/I18n";
import { MOBILE_QUERY, useMediaQuery } from "@/utils/useMediaQuery";

const ARTIFACT_BASE_ROOT =
  import.meta.env.VITE_ARTIFACT_BASE_ROOT ?? "/artifacts";

const INITIAL_SLUG =
  import.meta.env.VITE_DEFAULT_CITY_SLUG ?? "shibuya";

export function App() {
  const locale = useAppStore((s) => s.locale);
  const cityCode = useAppStore((s) => s.cityCode);
  const woodenPre1981 = useAppStore((s) => s.woodenPre1981);
  const setWoodenPre1981 = useAppStore((s) => s.setWoodenPre1981);
  const selectedFeature = useAppStore((s) => s.selectedFeature);
  const setSelectedFeature = useAppStore((s) => s.setSelectedFeature);

  const i18n = useMemo(() => new I18n(locale), [locale]);
  const isMobile = useMediaQuery(MOBILE_QUERY);

  const initialCity =
    CITIES.find((c) => c.slug === INITIAL_SLUG) ?? CITIES[0];
  const [slug, setSlug] = useState(initialCity.slug);
  const city = useMemo(
    () => CITIES.find((c) => c.slug === slug) ?? initialCity,
    [slug, initialCity],
  );
  const artifactPaths = useMemo(
    () => buildArtifactPaths(`${ARTIFACT_BASE_ROOT}/${city.slug}`),
    [city.slug],
  );

  const [manifest, setManifest] = useState<ManifestRegistry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [headerOpen, setHeaderOpen] = useState(!isMobile);
  const mapRef = useRef<MapStageHandle | null>(null);

  useEffect(() => {
    let cancelled = false;
    setManifest(null);
    setLoadError(null);
    ManifestRegistry.load(artifactPaths.manifestUrl)
      .then((reg) => {
        if (!cancelled) setManifest(reg);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [artifactPaths.manifestUrl]);

  useEffect(() => {
    const c = findCity(cityCode);
    if (c && c.slug !== slug) setSlug(c.slug);
  }, [cityCode, slug]);

  // Auto-collapse the header when crossing into mobile; auto-expand on desktop.
  useEffect(() => {
    setHeaderOpen(!isMobile);
  }, [isMobile]);

  return (
    <div style={{ position: "fixed", inset: 0, fontFamily: "system-ui, sans-serif" }}>
      {loadError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#F5F5F5",
            color: "#B71C1C",
            padding: 24,
            textAlign: "center",
            zIndex: 100,
          }}
        >
          <div>
            <h2>Failed to load manifest.json</h2>
            <p>{loadError}</p>
            <p style={{ fontSize: 12, color: "#666" }}>{artifactPaths.manifestUrl}</p>
          </div>
        </div>
      )}

      {manifest && (
        <>
          <MapStage
            ref={mapRef}
            key={city.slug}
            pmtilesUrl={artifactPaths.buildingsPmtilesUrl}
            manifest={manifest}
            initialCenter={city.center}
            initialZoom={city.zoom}
          />

          {isMobile && !headerOpen && (
            <button
              onClick={() => setHeaderOpen(true)}
              aria-label="Open controls"
              style={{
                position: "absolute",
                left: 12,
                top: 12,
                width: 44,
                height: 44,
                borderRadius: 8,
                border: 0,
                background: "rgba(255,255,255,0.96)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                fontSize: 22,
                cursor: "pointer",
                zIndex: 6,
              }}
            >
              ☰
            </button>
          )}

          {(headerOpen || !isMobile) && (
            <header
              style={{
                position: "absolute",
                left: 12,
                top: 12,
                padding: 12,
                width: isMobile ? "calc(100vw - 24px)" : 260,
                maxWidth: isMobile ? "calc(100vw - 24px)" : 280,
                maxHeight: isMobile ? "calc(100vh - 24px)" : undefined,
                overflowY: isMobile ? "auto" : undefined,
                background: "rgba(255,255,255,0.96)",
                borderRadius: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                zIndex: 5,
                fontSize: isMobile ? 14 : 13,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <strong style={{ fontSize: isMobile ? 16 : 14 }}>
                  {i18n.t("app.title")}
                </strong>
                <div style={{ display: "flex", gap: 6 }}>
                  <LanguageToggle />
                  {isMobile && (
                    <button
                      onClick={() => setHeaderOpen(false)}
                      aria-label="Close controls"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        border: "1px solid #DDD",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 18,
                        color: "#555",
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <small style={{ color: "#555" }}>{i18n.t("app.subtitle")}</small>
              <CityPicker
                currentSlug={slug}
                onChangeCity={(nextSlug) => setSlug(nextSlug)}
              />
              <LayerSwitcher i18n={i18n} />
              <OpacitySlider i18n={i18n} />
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 36,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={woodenPre1981}
                  onChange={(e) => setWoodenPre1981(e.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
                <span>{i18n.t("controls.wooden_pre1981")}</span>
              </label>
              <ExportToolbar
                i18n={i18n}
                manifest={manifest}
                mapRef={mapRef}
                fgbDirectoryUrl={artifactPaths.fgbDirectoryUrl}
              />
            </header>
          )}

          {selectedFeature && (
            <PropertyCard
              feature={selectedFeature}
              manifest={manifest}
              i18n={i18n}
              isMobile={isMobile}
              onClose={() => setSelectedFeature(null)}
            />
          )}

          {!isMobile && <CoverageBadge i18n={i18n} manifest={manifest} mapRef={mapRef} />}
          <Disclaimer i18n={i18n} manifest={manifest} />
        </>
      )}
    </div>
  );
}
