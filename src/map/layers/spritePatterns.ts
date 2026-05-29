import type maplibregl from "maplibre-gl";

const PATTERN_ID = "pattern-nodata-hatch";

export function registerNoDataPattern(map: maplibregl.Map): void {
  if (map.hasImage(PATTERN_ID)) return;
  const size = 16;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(60, 60, 60, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, size);
  ctx.lineTo(size, -4);
  ctx.moveTo(0, size + 4);
  ctx.lineTo(size + 4, 0);
  ctx.stroke();

  // Convert to ImageData for addImage (canvas direct works in maplibre-gl 5 but
  // ImageData avoids any pixelRatio quirks across browsers).
  const imageData = ctx.getImageData(0, 0, size, size);
  map.addImage(PATTERN_ID, imageData, { pixelRatio: 2 });
}

export const NO_DATA_PATTERN_ID = PATTERN_ID;
