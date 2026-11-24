import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { withBrowser } from "@/pixen/capture/browser.js";
import { withPage } from "@/pixen/capture/page.js";
import { takeFullPageScreenshot } from "@/pixen/capture/screenshot.js";
import { presetToContextOptions } from "@/pixen/capture/viewport.js";
import { PRESET_DESKTOP, PRESET_MOBILE } from "@/pixen/models/index.js";

describe("takeFullPageScreenshot — scale: device", () => {
  it.each([
    { name: "desktop", preset: PRESET_DESKTOP, expectedWidth: 1440 },
    { name: "mobile", preset: PRESET_MOBILE, expectedWidth: 780 },
  ])("$name produces a PNG at CSS width × DPR", async ({ preset, expectedWidth }) => {
    await withBrowser(async (browser) => {
      await withPage(
        browser,
        async ({ page }) => {
          await page.setContent(`
              <!doctype html>
              <html>
                <head>
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                </head>
                <body><h1>${preset.name}</h1></body>
              </html>
            `);
          const buf = await takeFullPageScreenshot(page);
          const meta = await sharp(buf).metadata();
          expect(meta.width).toBe(expectedWidth);
        },
        { contextOptions: presetToContextOptions(preset) },
      );
    });
  });
});
