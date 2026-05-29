import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { registerPmtilesProtocol } from "./sources/pmtilesProtocol";
import {
  HAZARD_SOURCE_ID,
  HazardLayerRegistry,
} from "./layers/HazardLayerRegistry";
import { FeaturePicker } from "./interaction/FeaturePicker";
import type { ManifestRegistry } from "@/manifest/ManifestRegistry";
import { useAppStore } from "@/app/store/useAppStore";

interface MapStageProps {
  pmtilesUrl: string;
  manifest: ManifestRegistry;
  initialCenter: [number, number];
  initialZoom: number;
}

export interface MapStageHandle {
  getMap(): maplibregl.Map | null;
  getCanvas(): HTMLCanvasElement | null;
  getViewportBbox(): [number, number, number, number] | null;
  waitForIdle(): Promise<void>;
  queryRenderedBuildings(): maplibregl.MapGeoJSONFeature[];
  getBuildingLayerIds(): string[];
}

const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#F5F5F0" },
    },
  ],
};

export const MapStage = forwardRef<MapStageHandle, MapStageProps>(function MapStage(
  { pmtilesUrl, manifest, initialCenter, initialZoom },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const registryRef = useRef<HazardLayerRegistry | null>(null);
  const pickerRef = useRef<FeaturePicker | null>(null);

  const setSelectedFeature = useAppStore((s) => s.setSelectedFeature);

  useEffect(() => {
    if (!containerRef.current) return;
    registerPmtilesProtocol();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: initialCenter,
      zoom: initialZoom,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      attributionControl: false,
      crossSourceCollisions: false,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource(HAZARD_SOURCE_ID, {
        type: "vector",
        url: `pmtiles://${pmtilesUrl}`,
      });

      const registry = new HazardLayerRegistry(map);
      registry.installBaseLayers();

      const initialState = useAppStore.getState();
      registry.setActiveHazards(initialState.activeHazards);
      registry.setOpacity(initialState.hazardOpacity);
      registry.setWoodenPre1981(initialState.woodenPre1981);

      registryRef.current = registry;
      pickerRef.current = new FeaturePicker(map, manifest);

      map.on("click", (event) => {
        const picker = pickerRef.current;
        const reg = registryRef.current;
        if (!picker || !reg) return;
        const ids = reg.buildingLayerIds();
        const picked = picker.pickAtPoint(event.point, ids);
        setSelectedFeature(picked ? picked.props : null);
      });
    });

    return () => {
      registryRef.current?.destroy();
      registryRef.current = null;
      pickerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [pmtilesUrl, manifest, initialCenter, initialZoom, setSelectedFeature]);

  // Reactive bridge: state → registry.
  useEffect(() => {
    return useAppStore.subscribe((state, prev) => {
      const reg = registryRef.current;
      if (!reg) return;
      if (state.activeHazards !== prev.activeHazards) {
        reg.setActiveHazards(state.activeHazards);
      }
      if (state.hazardOpacity !== prev.hazardOpacity) {
        reg.setOpacity(state.hazardOpacity);
      }
      if (state.woodenPre1981 !== prev.woodenPre1981) {
        reg.setWoodenPre1981(state.woodenPre1981);
      }
    });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      getMap: () => mapRef.current,
      getCanvas: () => mapRef.current?.getCanvas() ?? null,
      getViewportBbox: () => {
        const map = mapRef.current;
        if (!map) return null;
        const b = map.getBounds();
        return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
      },
      waitForIdle: () =>
        new Promise<void>((resolve) => {
          const map = mapRef.current;
          if (!map) return resolve();
          if (map.loaded() && !map.isMoving() && !map.isZooming()) {
            return resolve();
          }
          map.once("idle", () => resolve());
        }),
      queryRenderedBuildings: () => {
        const map = mapRef.current;
        const reg = registryRef.current;
        if (!map || !reg) return [];
        const ids = reg.buildingLayerIds();
        if (ids.length === 0) return [];
        return map.queryRenderedFeatures({ layers: ids });
      },
      getBuildingLayerIds: () => registryRef.current?.buildingLayerIds() ?? [],
    }),
    [],
  );

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0 }}
      aria-label="Hazard map"
    />
  );
});
