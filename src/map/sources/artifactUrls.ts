/**
 * Centralized URL builder for plateau-core artifacts. Pointed at the city-specific
 * output directory produced by the pipeline. The base URL is supplied at app
 * construction time so this module never reads from import.meta.env directly.
 */
export interface ArtifactPaths {
  manifestUrl: string;
  buildingsPmtilesUrl: string;
  fgbDirectoryUrl: string;
}

export function buildArtifactPaths(base: string): ArtifactPaths {
  const trimmed = base.replace(/\/$/, "");
  return {
    manifestUrl: `${trimmed}/manifest.json`,
    buildingsPmtilesUrl: `${trimmed}/buildings.pmtiles`,
    fgbDirectoryUrl: `${trimmed}/buildings`,
  };
}
