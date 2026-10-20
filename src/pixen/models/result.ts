import type { PixenWarning, PresetName } from "@/pixen/models/index.js";

/* Result of a reference generation run */
export type ReferenceResult = {
  readonly url: string;
  readonly outputDir: string;
  readonly presets: readonly PresetName[];
  readonly warnings: readonly PixenWarning[];
};
