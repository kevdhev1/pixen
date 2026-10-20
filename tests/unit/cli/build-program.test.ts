import { describe, expect, it, vi } from "vitest";
import { buildProgram } from "@/pixen/cli/build-program.js";
import type { RunOptions } from "@/pixen/models/index.js";

/* Builds a program configured for testing */
function buildTestProgram(deps?: Parameters<typeof buildProgram>[0]) {
  const program = buildProgram(deps);
  program.exitOverride();
  program.configureOutput({
    writeErr: () => {},
  });
  return program;
}

describe("buildProgram — metadata", () => {
  it("contains the name, version, and description from package.json", () => {
    const program = buildTestProgram();
    expect(program.name()).toBe("pixen");
    expect(program.version()).toBeDefined();
    expect(program.description()).toBeDefined();
  });
});

describe("buildProgram — arguments and options", () => {
  it("requires the <url> argument", async () => {
    const program = buildTestProgram({ run: vi.fn() });

    await expect(program.parseAsync(["node", "pixen"])).rejects.toThrow();
  });

  it("accepts a valid URL and passes full presetNames", async () => {
    const runMock = vi.fn<(opts: RunOptions) => Promise<void>>().mockResolvedValue(undefined);
    const program = buildTestProgram({ run: runMock });

    await program.parseAsync(["node", "pixen", "https://example.com"]);

    expect(runMock).toHaveBeenCalledOnce();

    const call = runMock.mock.lastCall;
    if (!call) throw new Error("run was not called");
    const [opts] = call;

    expect(opts.url.href).toBe("https://example.com/");
    expect(opts.outputDir).toBe("./reference");
    expect(opts.presetNames).toEqual(["desktop", "tablet", "mobile"]);
    expect(opts.verbose).toBe(false);
  });

  it("--out overwrites the default directory", async () => {
    const runMock = vi.fn<(opts: RunOptions) => Promise<void>>().mockResolvedValue(undefined);
    const program = buildTestProgram({ run: runMock });

    await program.parseAsync(["node", "pixen", "https://example.com", "--out", "/tmp/refs"]);

    const call = runMock.mock.lastCall;
    if (!call) throw new Error("run was not called");
    const [opts] = call;

    expect(opts.outputDir).toBe("/tmp/refs");
  });

  it("normalizes the URL (no scheme → https)", async () => {
    const runMock = vi.fn<(opts: RunOptions) => Promise<void>>().mockResolvedValue(undefined);
    const program = buildTestProgram({ run: runMock });

    await program.parseAsync(["node", "pixen", "example.com"]);

    const call = runMock.mock.lastCall;
    if (!call) throw new Error("run was not called");
    const [opts] = call;

    expect(opts.url.href).toBe("https://example.com/");
  });

  it("rejects invalid URLs with PixenError", async () => {
    const program = buildTestProgram({ run: vi.fn() });

    await expect(program.parseAsync(["node", "pixen", "file:///etc/passwd"])).rejects.toThrow(
      /Unsupported scheme/,
    );
  });
});

describe("buildProgram — side effects", () => {
  it("calls run exactly once per invocation", async () => {
    const runMock = vi.fn<(opts: RunOptions) => Promise<void>>().mockResolvedValue(undefined);
    const program = buildTestProgram({ run: runMock });

    await program.parseAsync(["node", "pixen", "https://example.com"]);

    expect(runMock).toHaveBeenCalledTimes(1);
  });
});
