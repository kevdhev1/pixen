import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withBrowser } from "@/pixen/capture/browser.js";
import { measurePageInfo } from "@/pixen/capture/measure.js";
import { navigate } from "@/pixen/capture/navigate.js";
import { withPage } from "@/pixen/capture/page.js";
import { type FixturesServer, startFixturesServer } from "../../helpers/fixtures-server.js";

let server: FixturesServer;

beforeAll(async () => {
  server = await startFixturesServer();
});

afterAll(async () => {
  await server.close();
});

describe("measurePageInfo — simple page", () => {
  it("returns title, finalUrl, height, and no overflow", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        const nav = await navigate(page, new URL(`${server.baseUrl}/simple`));
        const info = await measurePageInfo(page, nav.finalUrl);

        expect(info.title).toBe("Simple fixture");
        expect(info.finalUrl).toBe(nav.finalUrl);
        expect(info.documentHeight).toBeGreaterThan(0);
        expect(info.hasHorizontalOverflow).toBe(false);
      });
    });
  });
});

describe("measurePageInfo — lazy page", () => {
  it("reports a tall document", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        const nav = await navigate(page, new URL(`${server.baseUrl}/lazy`));
        const info = await measurePageInfo(page, nav.finalUrl);

        // lazy.html has 3 spacers of 200vh + header + 3 images.
        // Default Playwright viewport is 1280x720, so 600vh = 4320px.
        expect(info.documentHeight).toBeGreaterThan(3000);
        expect(info.hasHorizontalOverflow).toBe(false);
      });
    });
  });
});

describe("measurePageInfo — horizontal overflow", () => {
  it("detects overflow when content is wider than viewport", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        await page.setContent(`
          <!doctype html>
          <html>
            <head><title>wide</title></head>
            <body>
              <div style="width: 5000px; height: 100px; background: red;"></div>
            </body>
          </html>
        `);
        const info = await measurePageInfo(page, "https://example.com/wide");

        expect(info.hasHorizontalOverflow).toBe(true);
        expect(info.title).toBe("wide");
      });
    });
  });

  it("returns false when content fits the viewport", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        await page.setContent(`
          <!doctype html>
          <html>
            <head><title>fits</title></head>
            <body><div style="width: 100px;">ok</div></body>
          </html>
        `);
        const info = await measurePageInfo(page, "https://example.com/fits");

        expect(info.hasHorizontalOverflow).toBe(false);
      });
    });
  });
});

describe("measurePageInfo — edge cases", () => {
  it("returns empty title when document has no title", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        await page.setContent("<html><body>no title</body></html>");
        const info = await measurePageInfo(page, "https://example.com");

        expect(info.title).toBe("");
      });
    });
  });
});
