import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RunOptions } from "@/pixen/models/index.js";
import { generateReference } from "@/pixen/reference.js";
import { type FixturesServer, startFixturesServer } from "../helpers/fixtures-server.js";

let server: FixturesServer;

beforeAll(async () => {
  server = await startFixturesServer({ slowDelayMs: 500 });
});

afterAll(async () => {
  await server.close();
});

function makeOptions(url: string): RunOptions {
  return {
    url: new URL(url),
    outputDir: "/tmp/pixen-test-output",
    presetNames: ["desktop", "tablet", "mobile"],
    verbose: false,
  };
}

describe("generateReference — happy path", () => {
  it("returns pageInfo for a simple page", async () => {
    const result = await generateReference(makeOptions(`${server.baseUrl}/simple`));

    expect(result.pageInfo.title).toBe("Simple fixture");
    expect(result.pageInfo.documentHeight).toBeGreaterThan(0);
    expect(result.pageInfo.hasHorizontalOverflow).toBe(false);
    expect(result.warnings).toHaveLength(0);

    expect(result.url).toBe(`${server.baseUrl}/simple`);
    expect(result.pageInfo.finalUrl).toBe(`${server.baseUrl}/simple`);
    expect(result.outputDir).toBe("/tmp/pixen-test-output");
    expect(result.presets).toEqual(["desktop", "tablet", "mobile"]);
  });

  it("records the final URL after redirects", async () => {
    const result = await generateReference(makeOptions(`${server.baseUrl}/redirect`));

    expect(result.url).toBe(`${server.baseUrl}/redirect`);
    expect(result.pageInfo.finalUrl).toBe(`${server.baseUrl}/simple`);
  });

  it("reports a tall document for the lazy page", async () => {
    const result = await generateReference(makeOptions(`${server.baseUrl}/lazy`));

    expect(result.pageInfo.documentHeight).toBeGreaterThan(3000);
    expect(result.warnings).toHaveLength(0);
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
