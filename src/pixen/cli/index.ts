#!/usr/bin/env node
import { buildProgram } from "@/pixen/cli/build-program.js";
import { PixenError } from "@/pixen/models/index.js";

async function main(): Promise<void> {
  try {
    await buildProgram().parseAsync();
  } catch (err) {
    if (PixenError.isPixenError(err)) {
      console.error(`error: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}

await main();
