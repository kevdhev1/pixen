import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withBrowser } from "@/pixen/capture/browser.js";
import { NAVIGATION_TIMEOUT_MS, WAIT_TIMEOUT_MS, withPage } from "@/pixen/capture/page.js";
import { type FixturesServer, startFixturesServer } from "../../helpers/fixtures-server.js";

let server: FixturesServer;

beforeAll(async () => {
  server = await startFixturesServer({ slowDelayMs: 500 });
});

afterAll(async () => {
  await server.close();
});

describe("timeout constants", () => {
  it("exports positive values", () => {
    expect(NAVIGATION_TIMEOUT_MS).toBeGreaterThan(0);
    expect(WAIT_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it("navigation timeout is larger than wait timeout", () => {
    expect(NAVIGATION_TIMEOUT_MS).toBeGreaterThan(WAIT_TIMEOUT_MS);
  });
});

describe("withPage — lifecycle", () => {
  it("returns a functional page", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        await page.setContent("<h1>hello</h1>");
        expect(await page.textContent("h1")).toBe("hello");
      });
    });
  });

  it("closes the context after success", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async () => {
        // nothing
      });

      expect(browser.contexts()).toHaveLength(0);
    });
  });

  it("closes the context after error", async () => {
    await withBrowser(async (browser) => {
      await expect(
        withPage(browser, async () => {
          throw new Error("intentional");
        }),
      ).rejects.toThrow("intentional");

      expect(browser.contexts()).toHaveLength(0);
    });
  });
});

describe("withPage — timeouts enforced", () => {
  it("enforces the wait timeout on a missing selector", async () => {
    await withBrowser(async (browser) => {
      await withPage(
        browser,
        async ({ page }) => {
          await page.setContent("<div>only this</div>");
          await expect(page.waitForSelector("#nonexistent", { state: "attached" })).rejects.toThrow(
            /timeout/i,
          );
        },
        { waitTimeoutMs: 100 },
      );
    });
  });

  it("enforces the navigation timeout on a slow endpoint", async () => {
    await withBrowser(async (browser) => {
      await withPage(
        browser,
        async ({ page }) => {
          await expect(page.goto(`${server.baseUrl}/slow`)).rejects.toThrow(/timeout/i);
        },
        { navigationTimeoutMs: 100 },
      );
    });
  });
});
