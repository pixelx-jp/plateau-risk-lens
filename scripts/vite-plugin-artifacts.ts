/**
 * Dev-server middleware that serves `/artifacts/<slug>/*` from a small set of
 * source roots without touching the publicDir. Each request is resolved
 * against the roots in order; first hit wins.
 *
 * Source roots:
 *   1. `<repoRoot>/.artifacts/<slug>/...`   — what `scripts/fetch-artifacts.sh`
 *                                              writes after downloading bundles
 *   2. `<plateauCoreRoot>/out_<slug>/...`  — sibling plateau-core checkout
 *
 * Why not symlink into `public/artifacts/` instead?
 *   Vite copies the whole publicDir into dist/ on build, which would bloat
 *   the deploy bundle. Artifacts are always external in production (R2 /
 *   S3), so they should be external in dev too.
 *
 * This plugin only mounts during `vite dev` / `vite preview`. It is a no-op
 * during the build pipeline.
 */
import type { Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";

const ARTIFACT_PREFIX = "/artifacts/";

interface Options {
  /** Sibling plateau-core checkout (sources via `out_<slug>/`). */
  plateauCoreRoot: string;
  /** Optional local fetched-bundle cache (sources via `<slug>/`). */
  fetchedCacheRoot?: string;
}

function resolveLayered(
  slug: string,
  rest: string,
  opts: Options,
): string | null {
  if (opts.fetchedCacheRoot) {
    const p = path.join(opts.fetchedCacheRoot, slug, rest);
    if (fs.existsSync(p)) return p;
  }
  const p2 = path.join(opts.plateauCoreRoot, `out_${slug}`, rest);
  if (fs.existsSync(p2)) return p2;
  return null;
}

export function artifactsDevMiddleware(
  plateauCoreRootOrOpts: string | Options,
): Plugin {
  const opts: Options =
    typeof plateauCoreRootOrOpts === "string"
      ? { plateauCoreRoot: plateauCoreRootOrOpts }
      : plateauCoreRootOrOpts;
  const handler = (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, next: () => void) => {
    const url = req.url ?? "";
    const match = url.match(/^\/?([^/]+)\/(.+)$/);
    if (!match) return next();
    const [, slug, restWithQuery] = match;
    const rest = restWithQuery.split("?")[0];
    const fullPath = resolveLayered(slug, rest, opts);

    // manifest.json: inject FGB file list so the SPA doesn't have to probe
    // (and so multi-ward cities like Osaka work correctly).
    if (rest === "manifest.json") {
      if (!fullPath) return next();
      fs.readFile(fullPath, (err, buf) => {
        if (err) return next();
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(buf.toString("utf8")) as Record<string, unknown>;
        } catch {
          return next();
        }
        const buildingsDir = path.join(path.dirname(fullPath), "buildings");
        try {
          const files = fs
            .readdirSync(buildingsDir)
            .filter((f) => f.endsWith(".fgb"))
            .sort();
          const artifacts = (parsed.artifacts as Record<string, unknown>) ?? {};
          artifacts.fgb_files = files;
          parsed.artifacts = artifacts;
        } catch {
          // No buildings/ directory or read failure — leave manifest unchanged.
        }
        const body = JSON.stringify(parsed);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Content-Length", Buffer.byteLength(body).toString());
        res.end(body);
      });
      return;
    }

    if (!fullPath) return next();
    fs.stat(fullPath, (err, stat) => {
      if (err || !stat.isFile()) return next();
      serveWithRange(req, res, fullPath, stat.size);
    });
  };

  return {
    name: "plateau-risk-lens:artifacts-dev",
    configureServer(server) {
      server.middlewares.use(ARTIFACT_PREFIX, handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(ARTIFACT_PREFIX, handler);
    },
  };
}

function serveWithRange(
  req: import("node:http").IncomingMessage,
  res: import("node:http").ServerResponse,
  fullPath: string,
  size: number,
): void {
  const mime = mimeFor(fullPath);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Accept-Ranges", "bytes");
  if (mime) res.setHeader("Content-Type", mime);

  const rangeHeader = req.headers.range;
  if (rangeHeader) {
    const m = rangeHeader.match(/^bytes=(\d+)-(\d*)$/);
    if (m) {
      const start = Number(m[1]);
      const end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
      const length = end - start + 1;
      res.statusCode = 206;
      res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
      res.setHeader("Content-Length", String(length));
      fs.createReadStream(fullPath, { start, end }).pipe(res);
      return;
    }
  }
  res.statusCode = 200;
  res.setHeader("Content-Length", String(size));
  fs.createReadStream(fullPath).pipe(res);
}

function mimeFor(filePath: string): string | null {
  if (filePath.endsWith(".pmtiles")) return "application/octet-stream";
  if (filePath.endsWith(".fgb")) return "application/octet-stream";
  if (filePath.endsWith(".json")) return "application/json";
  if (filePath.endsWith(".parquet")) return "application/octet-stream";
  return null;
}
