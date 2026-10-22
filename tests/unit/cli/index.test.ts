import type { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "@/pixen/cli/main.js";
import { PixenError } from "@/pixen/models/index.js";

function mockCommand(parseAsync: () => Promise<void>): Command {
  return { parseAsync } as unknown as Command;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  process.exitCode = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
});

describe("main — error handling", () => {
  it("PixenError → prints message to stderr, sets exit code 1", async () => {
    const program = mockCommand(() =>
      Promise.reject(new PixenError("INVALID_URL", "Unsupported scheme")),
    );

    await main(program);

    expect(console.error).toHaveBeenCalledWith("error: Unsupported scheme");
    expect(process.exitCode).toBe(1);
  });

  it("unexpected error → re-throws with stack trace", async () => {
    const program = mockCommand(() => Promise.reject(new TypeError("boom")));

    await expect(main(program)).rejects.toThrow(TypeError);
  });

  it("no error → leaves exit code at 0", async () => {
    const program = mockCommand(() => Promise.resolve());

    await main(program);

    expect(process.exitCode).toBe(0);
    expect(console.error).not.toHaveBeenCalled();
  });
});
