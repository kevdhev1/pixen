import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildProgram } from "@/pixen/cli/build-program.js";
import type { ReferenceResult, RunOptions } from "@/pixen/models/index.js";

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function buildTestProgram(deps?: Parameters<typeof buildProgram>[0]) {
  const program = buildProgram(deps);
  program.exitOverride();
  program.configureOutput({
    writeErr: () => {},
  });
  return program;
}

function makeStubResult(): ReferenceResult {
  return {
    url: "https://example.com/",
    outputDir: "./reference",
    presets: ["desktop", "tablet", "mobile"],
    warnings: [],
  };
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
    const program = buildTestProgram({ generateReference: vi.fn() });

    await expect(program.parseAsync(["node", "pixen"])).rejects.toThrow();
  });

  it("accepts a valid URL and passes full presetNames", async () => {
    const generateMock = vi
      .fn<(opts: RunOptions) => Promise<ReferenceResult>>()
      .mockResolvedValue(makeStubResult());
    const program = buildTestProgram({ generateReference: generateMock });

    await program.parseAsync(["node", "pixen", "https://example.com"]);

    expect(generateMock).toHaveBeenCalledOnce();

    const call = generateMock.mock.lastCall;
    if (!call) throw new Error("generateReference was not called");
    const [opts] = call;

    expect(opts.url.href).toBe("https://example.com/");
    expect(opts.outputDir).toBe("./reference");
    expect(opts.presetNames).toEqual(["desktop", "tablet", "mobile"]);
    expect(opts.verbose).toBe(false);
  });

  it("--out overwrites the default directory", async () => {
    const generateMock = vi
      .fn<(opts: RunOptions) => Promise<ReferenceResult>>()
      .mockResolvedValue(makeStubResult());
    const program = buildTestProgram({ generateReference: generateMock });

    await program.parseAsync(["node", "pixen", "https://example.com", "--out", "/tmp/refs"]);

    const call = generateMock.mock.lastCall;
    if (!call) throw new Error("generateReference was not called");
    const [opts] = call;

    expect(opts.outputDir).toBe("/tmp/refs");
  });

  it("normalizes the URL (no scheme → https)", async () => {
    const generateMock = vi
      .fn<(opts: RunOptions) => Promise<ReferenceResult>>()
      .mockResolvedValue(makeStubResult());
    const program = buildTestProgram({ generateReference: generateMock });

    await program.parseAsync(["node", "pixen", "example.com"]);

    const call = generateMock.mock.lastCall;
    if (!call) throw new Error("generateReference was not called");
    const [opts] = call;

    expect(opts.url.href).toBe("https://example.com/");
  });

  it("rejects invalid URLs with PixenError", async () => {
    const program = buildTestProgram({ generateReference: vi.fn() });

    await expect(program.parseAsync(["node", "pixen", "file:///etc/passwd"])).rejects.toThrow(
      /Unsupported scheme/,
    );
  });
});

describe("buildProgram — side effects", () => {
  it("calls generateReference exactly once per invocation", async () => {
    const generateMock = vi
      .fn<(opts: RunOptions) => Promise<ReferenceResult>>()
      .mockResolvedValue(makeStubResult());
    const program = buildTestProgram({ generateReference: generateMock });

    await program.parseAsync(["node", "pixen", "https://example.com"]);

    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it("prints the result returned by generateReference", async () => {
    const generateMock = vi
      .fn<(opts: RunOptions) => Promise<ReferenceResult>>()
      .mockResolvedValue(makeStubResult());
    const program = buildTestProgram({ generateReference: generateMock });

    await program.parseAsync(["node", "pixen", "https://example.com"]);

    const logSpy = vi.mocked(console.log);
    expect(logSpy).toHaveBeenCalledWith("URL:     https://example.com/");
    expect(logSpy).toHaveBeenCalledWith("Output:  ./reference");
    expect(logSpy).toHaveBeenCalledWith("Presets: desktop, tablet, mobile");
  });
});
