import type { PresetName } from "./preset.js";

/* Options for a Pixen execution */

export type RunOptions = {
  readonly url: URL;
  readonly outputDir: string;
  readonly presetNames: readonly PresetName[];
  readonly verbose: boolean;
};
