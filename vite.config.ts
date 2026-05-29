/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { artifactsDevMiddleware } from "./scripts/vite-plugin-artifacts";

const PLATEAU_CORE_ROOT = path.resolve(__dirname, "../plateau-core");
const FETCHED_CACHE_ROOT = path.resolve(__dirname, ".artifacts");

const config = defineConfig({
  plugins: [
    react(),
    artifactsDevMiddleware({
      plateauCoreRoot: PLATEAU_CORE_ROOT,
      fetchedCacheRoot: FETCHED_CACHE_ROOT,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: [".", "../plateau-core"],
    },
  },
  build: {
    target: "es2022",
    // maplibre is unavoidably large (~280 KB gzip); the warning would fire
    // on its own chunk even after splitting, so raise the threshold.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (id.includes("maplibre-gl")) return "maplibre";
            if (id.includes("pmtiles")) return "pmtiles";
            if (
              id.includes("react-dom") ||
              id.includes("/react/") ||
              id.includes("/scheduler/")
            ) {
              return "react-vendor";
            }
          }
          return undefined;
        },
      },
    },
  },
});

// Vitest extension lives on the same config; we keep this in a separate
// assignment so vite's defineConfig type doesn't complain about `test`.
(config as { test?: unknown }).test = {
  globals: true,
  environment: "node",
  include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  exclude: ["e2e/**", "node_modules/**", "dist/**"],
};

export default config;
