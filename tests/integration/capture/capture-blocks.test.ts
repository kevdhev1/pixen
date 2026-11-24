import { readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { withBrowser } from "@/pixen/capture/browser.js";
import { captureBlocks } from "@/pixen/capture/capture-blocks.js";
import { withPage } from "@/pixen/capture/page.js";
import { presetToContextOptions } from "@/pixen/capture/viewport.js";
import { type PageInfo, PRESET_DESKTOP, PRESET_MOBILE } from "@/pixen/models/index.js";
import { withWorkspace } from "@/pixen/workspace.js";

function makePageInfo(documentHeight: number): PageInfo {
  return {
    title: "test",
    finalUrl: "https://example.com/",
    documentHeight,
    hasHorizontalOverflow: false,
  };
}

async function renderPage(page: import("playwright").Page, heightCss: number): Promise<void> {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>body { margin: 0; } .tall { height: ${heightCss}px; background: linear-gradient(180deg, #4f46e5, #ec4899); }</style>
      </head>
      <body><div class="tall"></div></body>
    </html>
  `);
}

describe("captureBlocks — desktop", () => {
  it("produces chunks of 1440 device px width", async () => {
    await withWorkspace(async (ws) => {
      await withBrowser(async (browser) => {
        await withPage(
          browser,
          async ({ page }) => {
            await renderPage(page, 2500);
            const result = await captureBlocks(page, PRESET_DESKTOP, makePageInfo(2500), ws.path);
            expect(result.chunks.length).toBeGreaterThanOrEqual(3);

            for (const c of result.chunks) {
              expect(c.widthPx).toBe(1440);
            }

            const first = result.chunks[0];
            if (!first) throw new Error("no chunks");

            expect(first.heightPx).toBe(1018);
            expect(result.omittedDevicePx).toBe(0);
          },
          { contextOptions: presetToContextOptions(PRESET_DESKTOP) },
        );
      });
    });
  });
});

describe("captureBlocks — mobile", () => {
  it("splits a 1103 CSS px page into 2 chunks of 780×1103", async () => {
    await withWorkspace(async (ws) => {
      await withBrowser(async (browser) => {
        await withPage(
          browser,
          async ({ page }) => {
            await renderPage(page, 1103);
            const result = await captureBlocks(page, PRESET_MOBILE, makePageInfo(1103), ws.path);
            expect(result.chunks).toHaveLength(2);

            for (const c of result.chunks) {
              expect(c.widthPx).toBe(780);
              expect(c.heightPx).toBe(1103);
            }
            expect(result.omittedDevicePx).toBe(0);
          },
          { contextOptions: presetToContextOptions(PRESET_MOBILE) },
        );
      });
    });
  });

  it("omits a 1 CSS px remainder", async () => {
    await withWorkspace(async (ws) => {
      await withBrowser(async (browser) => {
        await withPage(
          browser,
          async ({ page }) => {
            await renderPage(page, 1104);
            const result = await captureBlocks(page, PRESET_MOBILE, makePageInfo(1104), ws.path);
            expect(result.chunks).toHaveLength(2);
            expect(result.omittedDevicePx).toBe(2);
          },
          { contextOptions: presetToContextOptions(PRESET_MOBILE) },
        );
      });
    });
  });

  it("deletes block temp PNGs after splitting", async () => {
    await withWorkspace(async (ws) => {
      await withBrowser(async (browser) => {
        await withPage(
          browser,
          async ({ page }) => {
            await renderPage(page, 1103);
            await captureBlocks(page, PRESET_MOBILE, makePageInfo(1103), ws.path);
            const files = await readdir(path.join(ws.path, "mobile"));
            const blockTempFiles = files.filter(
              (f) => f.startsWith("block-") && !f.includes("-chunk-"),
            );
            expect(blockTempFiles).toHaveLength(0);
          },
          { contextOptions: presetToContextOptions(PRESET_MOBILE) },
        );
      });
    });
  });
});

describe("captureBlocks — errors", () => {
  it("throws CAPTURE_FAILED when the page is shorter than declared", async () => {
    await withWorkspace(async (ws) => {
      await withBrowser(async (browser) => {
        await withPage(browser, async ({ page }) => {
          await renderPage(page, 500);
          await expect(
            captureBlocks(page, PRESET_DESKTOP, makePageInfo(10000), ws.path),
          ).rejects.toMatchObject({ code: "CAPTURE_FAILED" });
        });
      });
    });
  });
});
