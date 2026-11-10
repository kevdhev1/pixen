import type { PageInfo, PixenWarning, PresetName } from "@/pixen/models/index.js";

/* Result of one preset's pipeline run */
export type PresetResult = {
  readonly preset: PresetName;
  readonly pageInfo: PageInfo;
};

/* Result of a reference generation run */
export type ReferenceResult = {
  readonly url: string;
  readonly outputDir: string;
  readonly results: readonly PresetResult[];
  readonly warnings: readonly PixenWarning[];
};
