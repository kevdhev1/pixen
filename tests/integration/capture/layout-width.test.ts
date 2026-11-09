import { describe, expect, it } from "vitest";
import { withBrowser } from "@/pixen/capture/browser.js";
import { measureLayoutWidth } from "@/pixen/capture/layout-width.js";
import { withPage } from "@/pixen/capture/page.js";

describe("measureLayoutWidth — integration", () => {
  it("reports no overflow when content fits", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        await page.setContent(`
          <!doctype html>
          <html><body><div style="width: 100px;">ok</div></body></html>
        `);
        const m = await measureLayoutWidth(page);
        expect(m.layoutWidth).toBe(m.innerWidth);
        expect(m.scrollWidth).toBeLessThanOrEqual(m.innerWidth);
      });
    });
  });

  it("detects horizontal overflow", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        await page.setContent(`
          <!doctype html>
          <html><body><div style="width: 3000px; height: 100px;"></div></body></html>
        `);
        const m = await measureLayoutWidth(page);
        expect(m.scrollWidth).toBeGreaterThan(m.innerWidth);
        expect(m.layoutWidth).toBeGreaterThan(m.innerWidth);
      });
    });
  });
});
