import { describe, expect, it } from "vitest";
import { withBrowser } from "@/pixen/capture/browser.js";

describe("withBrowser — lifecycle", () => {
  it("runs the callback with a connected browser", async () => {
    await withBrowser(async (browser) => {
      expect(browser.isConnected()).toBe(true);
    });
  });

  it("closes the browser after success", async () => {
    let captured: import("playwright").Browser | undefined;

    await withBrowser(async (browser) => {
      captured = browser;
    });

    expect(captured).toBeDefined();
    expect(captured?.isConnected()).toBe(false);
  });

  it("closes the browser after error", async () => {
    let captured: import("playwright").Browser | undefined;

    await expect(
      withBrowser(async (browser) => {
        captured = browser;
        throw new Error("intentional failure");
      }),
    ).rejects.toThrow("intentional failure");

    expect(captured).toBeDefined();
    expect(captured?.isConnected()).toBe(false);
  });

  it("propagates the return value from the callback", async () => {
    const result = await withBrowser(async () => 42);
    expect(result).toBe(42);
  });

  it("propagates the return value of complex types", async () => {
    const result = await withBrowser(async () => ({
      title: "example",
      count: 3,
    }));

    expect(result).toEqual({ title: "example", count: 3 });
  });
});
