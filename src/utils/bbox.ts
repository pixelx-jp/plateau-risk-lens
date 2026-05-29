import type { BBox } from "@/types/map";

/** Returns true if the two axis-aligned WGS84 bboxes overlap (including edges). */
export function intersects(a: BBox, b: BBox): boolean {
  const [aMinX, aMinY, aMaxX, aMaxY] = a;
  const [bMinX, bMinY, bMaxX, bMaxY] = b;
  return !(aMaxX < bMinX || aMinX > bMaxX || aMaxY < bMinY || aMinY > bMaxY);
}

/** Compute the bounding box of a GeoJSON geometry. Returns null for empty input. */
export function geometryBbox(geom: GeoJSON.Geometry): BBox | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const visit = (coords: GeoJSON.Position) => {
    if (coords[0] < minX) minX = coords[0];
    if (coords[1] < minY) minY = coords[1];
    if (coords[0] > maxX) maxX = coords[0];
    if (coords[1] > maxY) maxY = coords[1];
  };

  const walk = (g: GeoJSON.Geometry): void => {
    switch (g.type) {
      case "Point":
        visit(g.coordinates);
        return;
      case "MultiPoint":
      case "LineString":
        g.coordinates.forEach(visit);
        return;
      case "MultiLineString":
      case "Polygon":
        g.coordinates.forEach((ring) => ring.forEach(visit));
        return;
      case "MultiPolygon":
        g.coordinates.forEach((poly) => poly.forEach((ring) => ring.forEach(visit)));
        return;
      case "GeometryCollection":
        g.geometries.forEach(walk);
        return;
    }
  };

  walk(geom);
  if (!Number.isFinite(minX)) return null;
  return [minX, minY, maxX, maxY];
}

/** True if the feature's geometry bbox overlaps the given bbox. */
export function featureIntersectsBbox(feature: GeoJSON.Feature, bbox: BBox): boolean {
  if (!feature.geometry) return false;
  const fb = geometryBbox(feature.geometry);
  if (!fb) return false;
  return intersects(fb, bbox);
}
