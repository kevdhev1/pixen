import type { RunOptions } from "@/pixen/models/index.js";

/* Pixen pipeline orchestrator */
export async function run(options: RunOptions): Promise<void> {
  console.log("Pixen would now:");
  console.log(`  Capture: ${options.url.href}`);
  console.log(`  Output:  ${options.outputDir}`);
  console.log(`  Presets: ${options.presetNames.join(", ")}`);
  console.log(`  Verbose: ${options.verbose}`);
}
