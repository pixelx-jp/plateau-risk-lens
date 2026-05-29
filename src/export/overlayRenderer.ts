import type { LegendItem, ScreenshotOverlayModel } from "./screenshotTypes";

const PADDING = 14;
const LINE_HEIGHT = 16;
const PANEL_BG = "rgba(255, 255, 255, 0.92)";
const PANEL_BORDER = "rgba(0, 0, 0, 0.18)";
const TEXT_COLOR = "#212121";
const MUTED_COLOR = "#555";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  roundRect(ctx, x, y, w, h, 6);
  ctx.fillStyle = PANEL_BG;
  ctx.fill();
  ctx.strokeStyle = PANEL_BORDER;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawSwatch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  item: LegendItem,
) {
  ctx.fillStyle = item.swatch;
  ctx.fillRect(x, y, size, size);
  if (item.pattern === "hatch") {
    ctx.strokeStyle = "rgba(40, 40, 40, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let offset = -size; offset < size * 2; offset += 4) {
      ctx.moveTo(x + offset, y + size);
      ctx.lineTo(x + offset + size, y);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, size, size);
}

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlay: ScreenshotOverlayModel,
  pixelRatio: number,
): void {
  ctx.save();
  ctx.scale(pixelRatio, pixelRatio);

  const logicalWidth = width / pixelRatio;
  const logicalHeight = height / pixelRatio;

  // Top-left: title + subtitle.
  ctx.font = "600 16px system-ui, -apple-system, sans-serif";
  const titleWidth = Math.max(
    ctx.measureText(overlay.title).width,
    ctx.measureText(overlay.subtitle).width,
  );
  const titlePanelW = Math.min(titleWidth + PADDING * 2, logicalWidth - 24);
  const titlePanelH = LINE_HEIGHT * 2 + PADDING + 6;
  drawPanel(ctx, 12, 12, titlePanelW, titlePanelH);
  ctx.fillStyle = TEXT_COLOR;
  ctx.textBaseline = "top";
  ctx.fillText(overlay.title, 12 + PADDING, 12 + PADDING);
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillStyle = MUTED_COLOR;
  ctx.fillText(overlay.subtitle, 12 + PADDING, 12 + PADDING + LINE_HEIGHT + 2);

  // Top-right: legend.
  if (overlay.legendItems.length > 0) {
    ctx.font = "12px system-ui, sans-serif";
    const swatchSize = 12;
    const labelGap = 8;
    const legendItemHeight = swatchSize + 6;
    const legendWidth =
      Math.max(
        ...overlay.legendItems.map((it) => ctx.measureText(it.label).width),
      ) +
      swatchSize +
      labelGap +
      PADDING * 2;
    const legendHeight =
      overlay.legendItems.length * legendItemHeight + PADDING * 2;
    const lx = logicalWidth - legendWidth - 12;
    const ly = 12;
    drawPanel(ctx, lx, ly, legendWidth, legendHeight);
    ctx.fillStyle = TEXT_COLOR;
    overlay.legendItems.forEach((item, i) => {
      const sy = ly + PADDING + i * legendItemHeight;
      drawSwatch(ctx, lx + PADDING, sy, swatchSize, item);
      ctx.fillStyle = TEXT_COLOR;
      ctx.fillText(item.label, lx + PADDING + swatchSize + labelGap, sy);
    });
  }

  // Bottom-left: attribution + coverage + timestamp + disclaimer.
  const bottomLines: string[] = [
    overlay.disclaimer,
    ...overlay.coverageLines,
    ...overlay.attributionLines,
    overlay.timestamp,
  ];
  ctx.font = "11px system-ui, sans-serif";
  const bottomTextWidth = Math.max(
    ...bottomLines.map((l) => ctx.measureText(l).width),
  );
  const bottomPanelW = Math.min(
    bottomTextWidth + PADDING * 2,
    logicalWidth - 24,
  );
  const bottomPanelH = bottomLines.length * (LINE_HEIGHT - 2) + PADDING * 2;
  const by = logicalHeight - bottomPanelH - 12;
  drawPanel(ctx, 12, by, bottomPanelW, bottomPanelH);
  ctx.fillStyle = TEXT_COLOR;
  bottomLines.forEach((line, i) => {
    ctx.fillStyle = i === 0 ? "#B71C1C" : TEXT_COLOR;
    ctx.font =
      i === 0
        ? "600 11px system-ui, sans-serif"
        : "11px system-ui, sans-serif";
    ctx.fillText(line, 12 + PADDING, by + PADDING + i * (LINE_HEIGHT - 2));
  });

  ctx.restore();
}
