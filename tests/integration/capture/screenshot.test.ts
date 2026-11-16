import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { withBrowser } from "@/pixen/capture/browser.js";
import { withPage } from "@/pixen/capture/page.js";
import { captureFullPage } from "@/pixen/capture/screenshot.js";
import { presetToContextOptions } from "@/pixen/capture/viewport.js";
import { PRESET_DESKTOP, PRESET_MOBILE } from "@/pixen/models/index.js";
import { withWorkspace } from "@/pixen/workspace.js";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("captureFullPage", () => {
  it("writes a valid PNG for a simple page", async () => {
    let capturedPath = "";
    let capturedBytes = 0;

    await withWorkspace(async (ws) => {
      capturedPath = path.join(ws.path, "simple.png");

      await withBrowser(async (browser) => {
        await withPage(browser, async ({ page }) => {
          await page.setContent("<html><body><h1>hi</h1></body></html>");
          const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
          const result = await captureFullPage(page, capturedPath, {
            viewportWidthCss: 1280,
            documentHeightCss: docHeight,
            deviceScaleFactor: 1,
          });
          capturedBytes = result.bytes;
        });
      });

      const buf = await readFile(capturedPath);
      expect(buf.length).toBe(capturedBytes);
      expect(buf.subarray(0, 8)).toEqual(PNG_MAGIC);
    });

    await expect(stat(capturedPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("produces larger files for taller content", async () => {
    const sizes: number[] = [];

    await withWorkspace(async (ws) => {
      await withBrowser(async (browser) => {
        await withPage(browser, async ({ page }) => {
          await page.setContent("<html><body><h1>hi</h1></body></html>");
          const shortHeight = await page.evaluate(() => document.documentElement.scrollHeight);
          const short = await captureFullPage(page, path.join(ws.path, "short.png"), {
            viewportWidthCss: 1280,
            documentHeightCss: shortHeight,
            deviceScaleFactor: 1,
          });

          await page.setContent(
            `<html><body><div style="height:5000px;background:red;"></div></body></html>`,
          );
          const tallHeight = await page.evaluate(() => document.documentElement.scrollHeight);
          const tall = await captureFullPage(page, path.join(ws.path, "tall.png"), {
            viewportWidthCss: 1280,
            documentHeightCss: tallHeight,
            deviceScaleFactor: 1,
          });

          sizes.push(short.bytes, tall.bytes);
        });
      });
    });

    expect(sizes[1]).toBeGreaterThan(sizes[0] ?? 0);
  });
});

describe("captureFullPage — scale: device", () => {
  it.each([
    {
      name: "desktop",
      preset: PRESET_DESKTOP,
      expectedWidth: 1440,
    },
    {
      name: "mobile",
      preset: PRESET_MOBILE,
      expectedWidth: 780,
    },
  ])("$name produces a PNG at CSS width × DPR", async ({ preset, expectedWidth }) => {
    await withWorkspace(async (ws) => {
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
            const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
            const result = await captureFullPage(page, path.join(ws.path, "out.png"), {
              viewportWidthCss: preset.viewport.width,
              documentHeightCss: docHeight,
              deviceScaleFactor: preset.deviceScaleFactor,
            });
            const meta = await sharp(result.path).metadata();
            expect(meta.width).toBe(expectedWidth);
          },
          { contextOptions: presetToContextOptions(preset) },
        );
      });
    });
  });
});

describe("captureFullPage — dimension verification", () => {
  it("throws CAPTURE_FAILED when width does not match", async () => {
    await withWorkspace(async (ws) => {
      await withBrowser(async (browser) => {
        await withPage(browser, async ({ page }) => {
          await page.setContent("<html><body><h1>hi</h1></body></html>");
          const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);

          // Width 1280 CSS × DPR 2 = 2560 device, but actual is 1280×1 = 1280.
          await expect(
            captureFullPage(page, path.join(ws.path, "bad.png"), {
              viewportWidthCss: 1280,
              documentHeightCss: docHeight,
              deviceScaleFactor: 2,
            }),
          ).rejects.toMatchObject({ code: "CAPTURE_FAILED" });
        });
      });
    });
  });

  it("throws CAPTURE_FAILED when height is far off", async () => {
    await withWorkspace(async (ws) => {
      await withBrowser(async (browser) => {
        await withPage(browser, async ({ page }) => {
          await page.setContent("<html><body><h1>hi</h1></body></html>");
          const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);

          // Ask for 100px more than the actual document.
          await expect(
            captureFullPage(page, path.join(ws.path, "bad.png"), {
              viewportWidthCss: 1280,
              documentHeightCss: docHeight + 100,
              deviceScaleFactor: 1,
            }),
          ).rejects.toMatchObject({ code: "CAPTURE_FAILED" });
        });
      });
    });
  });

  it("tolerates small height mismatches (≤2px)", async () => {
    await withWorkspace(async (ws) => {
      await withBrowser(async (browser) => {
        await withPage(browser, async ({ page }) => {
          await page.setContent("<html><body><h1>hi</h1></body></html>");
          const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);

          // Ask for 2px less than the document. Clip is 2px short, so
          // actual height = expected.
          await expect(
            captureFullPage(page, path.join(ws.path, "ok.png"), {
              viewportWidthCss: 1280,
              documentHeightCss: docHeight,
              deviceScaleFactor: 1,
            }),
          ).resolves.toMatchObject({ width: 1280 });
        });
      });
    });
  });
});
