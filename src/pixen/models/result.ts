import type { PageInfo, PixenWarning, PresetName } from "@/pixen/models/index.js";

/* Result of a reference generation run */
export type ReferenceResult = {
  readonly url: string;
  readonly outputDir: string;
  readonly presets: readonly PresetName[];
  readonly pageInfo: PageInfo;
  readonly warnings: readonly PixenWarning[];
};
