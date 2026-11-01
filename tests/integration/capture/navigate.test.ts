import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withBrowser } from "@/pixen/capture/browser.js";
import { navigate } from "@/pixen/capture/navigate.js";
import { withPage } from "@/pixen/capture/page.js";
import { PixenError } from "@/pixen/models/index.js";
import { type FixturesServer, startFixturesServer } from "../../helpers/fixtures-server.js";

let server: FixturesServer;

beforeAll(async () => {
  server = await startFixturesServer({ slowDelayMs: 500 });
});

afterAll(async () => {
  await server.close();
});

describe("navigate — success", () => {
  it("returns final URL, status, and content type", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        const result = await navigate(page, new URL(`${server.baseUrl}/simple`));

        expect(result.status).toBe(200);
        expect(result.contentType).toContain("text/html");
        expect(result.finalUrl).toBe(`${server.baseUrl}/simple`);
      });
    });
  });

  it("records the final URL after redirects", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        const result = await navigate(page, new URL(`${server.baseUrl}/redirect`));

        expect(result.status).toBe(200);
        expect(result.finalUrl).toBe(`${server.baseUrl}/simple`);
      });
    });
  });
});

describe("navigate — errors", () => {
  it("throws NAVIGATION_FAILED on HTTP 404", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        await expect(
          navigate(page, new URL(`${server.baseUrl}/does-not-exist`)),
        ).rejects.toMatchObject({
          code: "NAVIGATION_FAILED",
        });
      });
    });
  });

  it("includes the status code in the error context", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        let caught: unknown;
        try {
          await navigate(page, new URL(`${server.baseUrl}/does-not-exist`));
        } catch (err) {
          caught = err;
        }

        expect(PixenError.isPixenError(caught)).toBe(true);
        if (PixenError.isPixenError(caught)) {
          expect(caught.context.status).toBe(404);
        }
      });
    });
  });

  it("throws NAVIGATION_FAILED on non-HTML content", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        await expect(
          navigate(page, new URL(`${server.baseUrl}/img/tiny.png`)),
        ).rejects.toMatchObject({
          code: "NAVIGATION_FAILED",
        });
      });
    });
  });

  it("throws NAVIGATION_TIMEOUT on a slow endpoint", async () => {
    await withBrowser(async (browser) => {
      await withPage(
        browser,
        async ({ page }) => {
          await expect(navigate(page, new URL(`${server.baseUrl}/slow`))).rejects.toMatchObject({
            code: "NAVIGATION_TIMEOUT",
          });
        },
        { navigationTimeoutMs: 100 },
      );
    });
  });
});
