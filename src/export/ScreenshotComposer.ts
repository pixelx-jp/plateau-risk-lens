import { drawOverlay } from "./overlayRenderer";
import type { ScreenshotInput } from "./screenshotTypes";

export class ScreenshotError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}

export class ScreenshotComposer {
  /**
   * Compose the final PNG. Throws ScreenshotError if the WebGL canvas is
   * CORS-tainted (`toDataURL` will throw a SecurityError) — callers must
   * surface this so the user understands their artifact host needs CORS,
   * rather than silently downloading a blank image.
   */
  async compose(input: ScreenshotInput): Promise<Blob> {
    const { mapCanvas, pixelRatio, overlay } = input;
    const width = mapCanvas.width;
    const height = mapCanvas.height;

    const final = document.createElement("canvas");
    final.width = width;
    final.height = height;
    const ctx = final.getContext("2d");
    if (!ctx) throw new ScreenshotError("2D context unavailable");

    ctx.drawImage(mapCanvas, 0, 0);

    // Surface CORS taint up-front. Drawing a tainted source clears the 2D
    // canvas's origin-clean flag, so a single-pixel getImageData throws the
    // SecurityError here — far cheaper than encoding the entire map to a PNG
    // data URL just to probe (the previous approach), and it reuses the canvas
    // we already drew into.
    try {
      ctx.getImageData(0, 0, 1, 1);
    } catch (err) {
      throw new ScreenshotError(
        "Map canvas is CORS-tainted. Ensure all tile hosts return Access-Control-Allow-Origin: *.",
        err,
      );
    }

    drawOverlay(ctx, width, height, overlay, pixelRatio);

    return await new Promise<Blob>((resolve, reject) => {
      final.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new ScreenshotError("toBlob returned null"));
        },
        "image/png",
      );
    });
  }
}

export function assertCanvasReadable(canvas: HTMLCanvasElement): boolean {
  try {
    canvas.toDataURL("image/png");
    return true;
  } catch {
    return false;
  }
}
