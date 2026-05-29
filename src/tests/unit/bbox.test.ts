import { describe, expect, it } from "vitest";
import { intersects, geometryBbox, featureIntersectsBbox } from "@/utils/bbox";

describe("bbox.intersects", () => {
  it("overlapping boxes match", () => {
    expect(intersects([0, 0, 10, 10], [5, 5, 15, 15])).toBe(true);
  });

  it("boxes sharing only an edge still match (inclusive)", () => {
    expect(intersects([0, 0, 10, 10], [10, 0, 20, 10])).toBe(true);
  });

  it("disjoint boxes do not match", () => {
    expect(intersects([0, 0, 10, 10], [11, 11, 20, 20])).toBe(false);
    expect(intersects([0, 0, 10, 10], [-5, -5, -1, -1])).toBe(false);
  });

  it("one box inside another", () => {
    expect(intersects([0, 0, 100, 100], [10, 10, 20, 20])).toBe(true);
  });
});

describe("bbox.geometryBbox", () => {
  it("Polygon", () => {
    const geom: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [[
        [139.7, 35.6], [139.8, 35.6], [139.8, 35.7], [139.7, 35.7], [139.7, 35.6],
      ]],
    };
    expect(geometryBbox(geom)).toEqual([139.7, 35.6, 139.8, 35.7]);
  });

  it("MultiPolygon", () => {
    const geom: GeoJSON.MultiPolygon = {
      type: "MultiPolygon",
      coordinates: [
        [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        [[[10, 10], [11, 10], [11, 11], [10, 11], [10, 10]]],
      ],
    };
    expect(geometryBbox(geom)).toEqual([0, 0, 11, 11]);
  });

  it("GeometryCollection walks all members", () => {
    const geom: GeoJSON.GeometryCollection = {
      type: "GeometryCollection",
      geometries: [
        { type: "Point", coordinates: [5, 5] },
        { type: "Point", coordinates: [-2, 10] },
      ],
    };
    expect(geometryBbox(geom)).toEqual([-2, 5, 5, 10]);
  });
});

describe("bbox.featureIntersectsBbox", () => {
  const feature: GeoJSON.Feature = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
    },
  };

  it("hits when bbox overlaps geometry", () => {
    expect(featureIntersectsBbox(feature, [5, 5, 15, 15])).toBe(true);
  });

  it("misses when bbox is disjoint", () => {
    expect(featureIntersectsBbox(feature, [100, 100, 200, 200])).toBe(false);
  });

  it("returns false when feature has no geometry", () => {
    const noGeom: GeoJSON.Feature = { ...feature, geometry: null as never };
    expect(featureIntersectsBbox(noGeom, [0, 0, 1, 1])).toBe(false);
  });
});
