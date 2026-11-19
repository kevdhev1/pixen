import { readFileSync } from "node:fs";
import path from "node:path";
import { Command } from "commander";
import type { ReferenceResult, RunOptions } from "@/pixen/models/index.js";
import { isPresetName, PixenError, PRESETS, type PresetName } from "@/pixen/models/index.js";
import { generateReference } from "@/pixen/reference.js";
import { normalizeUrl } from "@/pixen/url.js";

/* Read `package.json` once and cache the result */
function readPackageJson(): { name: string; version: string; description: string } {
  const packageJsonPath = path.join(import.meta.dirname, "../../../package.json");
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    name: string;
    version: string;
    description: string;
  };
}

export type BuildProgramDeps = {
  /* Injectable for tests. By default, the actual `run` */
  generateReference?: (options: RunOptions) => Promise<ReferenceResult>;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/* Build the Commander `Command` without executing it */
export function buildProgram(deps: BuildProgramDeps = {}): Command {
  const generateFn = deps.generateReference ?? generateReference;
  const pkg = readPackageJson();

  const program = new Command();

  program
    .name(pkg.name)
    .version(pkg.version)
    .description(pkg.description)
    .argument("<url>", "URL of the page to capture")
    .option("--out <dir>", "Output directory", "./reference")
    .option("--preset <name>", "Run only the given preset (desktop|tablet|mobile)")
    .action(async (url: string, options: { out: string; preset?: string }) => {
      // The URL is validated/normalized here, not in the Commander handler.
      const normalizedUrl = normalizeUrl(url);

      let presetNames: readonly PresetName[];
      if (options.preset !== undefined) {
        if (!isPresetName(options.preset)) {
          throw new PixenError(
            "INVALID_PRESET",
            `Invalid preset: "${options.preset}". Valid values: desktop, tablet, mobile.`,
            { context: { preset: options.preset } },
          );
        }
        presetNames = [options.preset];
      } else {
        presetNames = PRESETS.map((p) => p.name);
      }

      const runOptions: RunOptions = {
        url: normalizedUrl,
        outputDir: options.out,
        presetNames,
        verbose: false,
      };

      const result = await generateFn(runOptions);

      console.log(`URL:      ${result.url}`);
      console.log(`Output:   ${result.outputDir}`);

      for (const r of result.results) {
        const title = r.pageInfo.title || "(untitled)";
        const dims = `${r.capturedWidthPx}×${r.capturedHeightPx}px`;
        const size = formatBytes(r.capturedBytes);
        const time = formatDuration(r.elapsedMs);

        console.log(`  ${r.preset.padEnd(8)} ${title} — ${dims} — ${size} — ${time}`);

        for (const w of r.warnings) {
          console.warn(`    warning: [${w.code}] ${w.message}`);
        }
      }
    });

  return program;
}
