import { readFileSync } from "node:fs";
import path from "node:path";
import { Command } from "commander";
import type { RunOptions } from "@/pixen/models/index.js";
import { PRESETS } from "@/pixen/models/index.js";
import { run } from "@/pixen/run.js";
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
  run?: (options: RunOptions) => Promise<void>;
};

/* Build the Commander `Command` without executing it */
export function buildProgram(deps: BuildProgramDeps = {}): Command {
  const runFn = deps.run ?? run;
  const pkg = readPackageJson();

  const program = new Command();

  program
    .name(pkg.name)
    .version(pkg.version)
    .description(pkg.description)
    .argument("<url>", "URL of the page to capture")
    .option("--out <dir>", "Output directory", "./reference")
    .action(async (url: string, options: { out: string }) => {
      // The URL is validated/normalized here, not in the Commander handler.
      const normalizedUrl = normalizeUrl(url);

      const runOptions: RunOptions = {
        url: normalizedUrl,
        outputDir: options.out,
        presetNames: PRESETS.map((p) => p.name),
        verbose: false,
      };

      await runFn(runOptions);
    });

  return program;
}
