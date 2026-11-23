import type { PageInfo, PixenWarning, PresetName } from "@/pixen/models/index.js";

/*
 * A chunk file on disk. Each chunk corresponds to one fragment of one block
 * in the capture plan.
 */
export type ChunkArtifact = {
  readonly preset: PresetName;
  readonly blockIndex: number;
  readonly fragmentIndex: number;
  readonly path: string;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly bytes: number;
};

/* Result of one preset's pipeline run */
export type PresetResult = {
  readonly preset: PresetName;
  readonly pageInfo: PageInfo;
  readonly capturedWidthPx: number;
  readonly capturedHeightPx: number;
  readonly chunks: readonly ChunkArtifact[];
  readonly omittedDevicePx: number;
  readonly elapsedMs: number;
  readonly warnings: readonly PixenWarning[];
};

/* Result of a reference generation run */
export type ReferenceResult = {
  readonly url: string;
  readonly outputDir: string;
  readonly results: readonly PresetResult[];
  readonly warnings: readonly PixenWarning[];
};
