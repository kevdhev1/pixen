import type { Command } from "commander";
import { buildProgram } from "@/pixen/cli/build-program.js";
import { PixenError } from "@/pixen/models/index.js";

/* Runs the CLI and handles top-level errors */
export async function main(program: Command = buildProgram()): Promise<void> {
  try {
    await program.parseAsync();
  } catch (err) {
    if (PixenError.isPixenError(err)) {
      console.error(`error: ${err.message}`);
      process.exitCode = 1;
      return;
    }
    throw err;
  }
}
