import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PresetName, RunOptions } from "@/pixen/models/index.js";
import { generateReference } from "@/pixen/reference.js";
import { type FixturesServer, startFixturesServer } from "../helpers/fixtures-server.js";

let server: FixturesServer;

beforeAll(async () => {
  server = await startFixturesServer({ slowDelayMs: 500 });
});

afterAll(async () => {
  await server.close();
});

function makeOptions(url: string, presetNames: readonly PresetName[] = ["desktop"]): RunOptions {
  return {
    url: new URL(url),
    outputDir: "/tmp/pixen-test-output",
    presetNames,
    verbose: false,
  };
}

describe("generateReference — happy path", () => {
  it("returns pageInfo for a simple page", async () => {
    const result = await generateReference(makeOptions(`${server.baseUrl}/simple`));

    expect(result.results).toHaveLength(1);

    const desktop = result.results[0];
    if (!desktop) throw new Error("expected desktop result");

    expect(desktop.preset).toBe("desktop");
    expect(desktop.pageInfo.title).toBe("Simple fixture");
    expect(desktop.pageInfo.documentHeight).toBeGreaterThan(0);
    expect(desktop.pageInfo.hasHorizontalOverflow).toBe(false);
    expect(result.warnings).toHaveLength(0);

    expect(result.url).toBe(`${server.baseUrl}/simple`);
    expect(result.outputDir).toBe("/tmp/pixen-test-output");
  });

  it("records the final URL after redirects", async () => {
    const result = await generateReference(makeOptions(`${server.baseUrl}/redirect`));

    const desktop = result.results[0];
    if (!desktop) throw new Error("expected desktop result");

    expect(result.url).toBe(`${server.baseUrl}/redirect`);
    expect(desktop.pageInfo.finalUrl).toBe(`${server.baseUrl}/simple`);
  });

  it("reports a tall document for the lazy page", async () => {
    const result = await generateReference(makeOptions(`${server.baseUrl}/lazy`));

    const desktop = result.results[0];
    if (!desktop) throw new Error("expected desktop result");

    expect(desktop.pageInfo.documentHeight).toBeGreaterThan(3000);
  });

  it("returns one result per requested preset, in order", async () => {
    const result = await generateReference(
      makeOptions(`${server.baseUrl}/simple`, ["desktop", "tablet", "mobile"]),
    );

    expect(result.results.map((r) => r.preset)).toEqual(["desktop", "tablet", "mobile"]);

    for (const r of result.results) {
      expect(r.pageInfo.documentHeight).toBeGreaterThan(0);
      expect(r.pageInfo.title).toBe("Simple fixture");
    }
  });

  it("each preset loads the page from scratch (not resized)", async () => {
    const result = await generateReference(
      makeOptions(`${server.baseUrl}/viewport-aware`, ["desktop", "tablet", "mobile"]),
    );

    expect(result.results[0]?.pageInfo.title).toBe("loaded-at-1440");
    expect(result.results[1]?.pageInfo.title).toBe("loaded-at-768");
    expect(result.results[2]?.pageInfo.title).toBe("loaded-at-390");
  });

  it("emits HORIZONTAL_OVERFLOW when the page is wider than the preset", async () => {
    const result = await generateReference(makeOptions(`${server.baseUrl}/overflow`));

    const codes = result.warnings.map((w) => w.code);
    expect(codes).toContain("HORIZONTAL_OVERFLOW");

    const overflow = result.warnings.find((w) => w.code === "HORIZONTAL_OVERFLOW");
    if (!overflow) throw new Error("expected HORIZONTAL_OVERFLOW warning");

    expect(overflow.data).toMatchObject({
      preset: "desktop",
      requestedWidth: 1440,
    });
  });
});

describe("generateReference — errors", () => {
  it("propagates NAVIGATION_FAILED on HTTP 404", async () => {
    await expect(
      generateReference(makeOptions(`${server.baseUrl}/does-not-exist`)),
    ).rejects.toMatchObject({ code: "NAVIGATION_FAILED" });
  });

  it("propagates NAVIGATION_FAILED on non-HTML content", async () => {
    await expect(
      generateReference(makeOptions(`${server.baseUrl}/img/tiny.png`)),
    ).rejects.toMatchObject({ code: "NAVIGATION_FAILED" });
  });
});
