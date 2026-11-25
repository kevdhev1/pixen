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
    results: [
      {
        preset: "desktop",
        pageInfo: {
          title: "Example",
          finalUrl: "https://example.com/",
          documentHeight: 900,
          hasHorizontalOverflow: false,
        },
        capturedWidthPx: 1440,
        capturedHeightPx: 900,
        chunks: [
          {
            preset: "desktop",
            blockIndex: 0,
            fragmentIndex: 0,
            path: "/tmp/x/desktop/block-0000-chunk-00.png",
            widthPx: 1440,
            heightPx: 900,
            bytes: 12345,
          },
        ],
        omittedDevicePx: 0,
        elapsedMs: 1234,
        warnings: [],
      },
      {
        preset: "tablet",
        pageInfo: {
          title: "Example",
          finalUrl: "https://example.com/",
          documentHeight: 1024,
          hasHorizontalOverflow: false,
        },
        capturedWidthPx: 1536,
        capturedHeightPx: 2048,
        chunks: [
          {
            preset: "tablet",
            blockIndex: 0,
            fragmentIndex: 0,
            path: "/tmp/x/tablet/block-0000-chunk-00.png",
            widthPx: 1536,
            heightPx: 2048,
            bytes: 23456,
          },
        ],
        omittedDevicePx: 0,
        elapsedMs: 1500,
        warnings: [],
      },
      {
        preset: "mobile",
        pageInfo: {
          title: "Example",
          finalUrl: "https://example.com/",
          documentHeight: 844,
          hasHorizontalOverflow: false,
        },
        capturedWidthPx: 780,
        capturedHeightPx: 1688,
        chunks: [
          {
            preset: "mobile",
            blockIndex: 0,
            fragmentIndex: 0,
            path: "/tmp/x/mobile/block-0000-chunk-00.png",
            widthPx: 780,
            heightPx: 844,
            bytes: 17678,
          },
          {
            preset: "mobile",
            blockIndex: 0,
            fragmentIndex: 1,
            path: "/tmp/x/mobile/block-0000-chunk-01.png",
            widthPx: 780,
            heightPx: 844,
            bytes: 16889,
          },
        ],
        omittedDevicePx: 0,
        elapsedMs: 1400,
        warnings: [],
      },
    ],
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

  it("prints one line per preset with chunk count, size, and time", async () => {
    const generateMock = vi
      .fn<(opts: RunOptions) => Promise<ReferenceResult>>()
      .mockResolvedValue(makeStubResult());
    const program = buildTestProgram({ generateReference: generateMock });

    await program.parseAsync(["node", "pixen", "https://example.com"]);

    const logSpy = vi.mocked(console.log);
    expect(logSpy).toHaveBeenCalledWith("URL:      https://example.com/");
    expect(logSpy).toHaveBeenCalledWith("Output:   ./reference");
    expect(logSpy).toHaveBeenCalledWith(
      "  desktop  Example — 1440×900px — 1 chunks — 12.1 KB — 1.2s",
    );
    expect(logSpy).toHaveBeenCalledWith(
      "  tablet   Example — 1536×2048px — 1 chunks — 22.9 KB — 1.5s",
    );
    expect(logSpy).toHaveBeenCalledWith(
      "  mobile   Example — 780×1688px — 2 chunks — 33.8 KB — 1.4s",
    );
  });

  it("--preset runs only the specified preset", async () => {
    const generateMock = vi
      .fn<(opts: RunOptions) => Promise<ReferenceResult>>()
      .mockResolvedValue(makeStubResult());
    const program = buildTestProgram({ generateReference: generateMock });

    await program.parseAsync(["node", "pixen", "https://example.com", "--preset", "mobile"]);

    const call = generateMock.mock.lastCall;
    if (!call) throw new Error("generateReference was not called");
    expect(call[0].presetNames).toEqual(["mobile"]);
  });

  it("rejects invalid --preset values", async () => {
    const program = buildTestProgram({ generateReference: vi.fn() });

    await expect(
      program.parseAsync(["node", "pixen", "https://example.com", "--preset", "foo"]),
    ).rejects.toMatchObject({ code: "INVALID_PRESET" });
  });
});
