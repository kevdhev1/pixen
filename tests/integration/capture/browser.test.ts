import { chromium } from "playwright";
import { describe, expect, it, vi } from "vitest";
import { withBrowser } from "@/pixen/capture/browser.js";
import { PixenError } from "@/pixen/models/index.js";

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

describe("withBrowser — missing Chromium", () => {
  it("throws BROWSER_NOT_INSTALLED when executable is missing", async () => {
    const spy = vi.spyOn(chromium, "executablePath").mockReturnValue("/nonexistent/chromium");

    try {
      await expect(withBrowser(async () => "unreachable")).rejects.toMatchObject({
        code: "BROWSER_NOT_INSTALLED",
      });
    } finally {
      spy.mockRestore();
    }
  });

  it("the error message includes the install command and Linux hint", async () => {
    const spy = vi.spyOn(chromium, "executablePath").mockReturnValue("/nonexistent/chromium");

    try {
      let caught: unknown;
      try {
        await withBrowser(async () => "unreachable");
      } catch (err) {
        caught = err;
      }

      expect(PixenError.isPixenError(caught)).toBe(true);
      if (PixenError.isPixenError(caught)) {
        expect(caught.message).toContain("playwright install chromium");
        expect(caught.message).toContain("--with-deps");
        expect(caught.message).toMatch(/Playwright \d+\.\d+\.\d+/);
      }
    } finally {
      spy.mockRestore();
    }
  });

  it("does not launch the browser when executable is missing", async () => {
    const execSpy = vi.spyOn(chromium, "executablePath").mockReturnValue("/nonexistent/chromium");
    const launchSpy = vi.spyOn(chromium, "launch");

    try {
      await expect(withBrowser(async () => "unreachable")).rejects.toThrow();
      expect(launchSpy).not.toHaveBeenCalled();
    } finally {
      execSpy.mockRestore();
      launchSpy.mockRestore();
    }
  });
});
