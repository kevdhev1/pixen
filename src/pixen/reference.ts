import type { ReferenceResult, RunOptions } from "@/pixen/models/index.js";

/* Orchestrates the full Pixen pipeline */
export async function generateReference(options: RunOptions): Promise<ReferenceResult> {
  return {
    url: options.url.href,
    outputDir: options.outputDir,
    presets: options.presetNames,
    warnings: [],
  };
}
