import { readFile } from "node:fs/promises";
import type { Page } from "playwright";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { withBrowser } from "@/pixen/capture/browser.js";
import { captureBlocks } from "@/pixen/capture/capture-blocks.js";
import { withPage } from "@/pixen/capture/page.js";
import { presetToContextOptions } from "@/pixen/capture/viewport.js";
import {
  type PageInfo,
  PRESET_DESKTOP,
  PRESET_MOBILE,
  PRESET_TABLET,
  type ViewportPreset,
} from "@/pixen/models/index.js";
import { withWorkspace } from "@/pixen/workspace.js";

/**
 * Builds a PNG where each device row has a unique color encoding its index.
 * Row index → color: r = y & 0xff, g = (y >> 8) & 0xff, b = (y >> 16) & 0xff.
 */
async function buildRulerPng(totalDeviceRows: number, widthDevice: number): Promise<Buffer> {
  const buf = Buffer.alloc(totalDeviceRows * widthDevice * 3);

  for (let y = 0; y < totalDeviceRows; y++) {
    const r = y & 0xff;
    const g = (y >> 8) & 0xff;
    const b = (y >> 16) & 0xff;

    for (let x = 0; x < widthDevice; x++) {
      const off = (y * widthDevice + x) * 3;

      buf[off] = r;
      buf[off + 1] = g;
      buf[off + 2] = b;
    }
  }

  return sharp(buf, {
    raw: { width: widthDevice, height: totalDeviceRows, channels: 3 },
  })
    .png()
    .toBuffer();
}

async function setRulerPage(
  page: Page,
  totalDeviceRows: number,
  dpr: number,
  widthDevice: number,
): Promise<void> {
  const png = await buildRulerPng(totalDeviceRows, widthDevice);
  const b64 = png.toString("base64");
  const cssWidth = widthDevice / dpr;
  const cssHeight = totalDeviceRows / dpr;

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { margin: 0; }
          img {
            display: block;
            width: ${cssWidth}px;
            height: ${cssHeight}px;
            image-rendering: pixelated;
          }
        </style>
      </head>
      <body><img src="data:image/png;base64,${b64}" /></body>
    </html>
  `);
}

async function readFirstRowColor(pngBuffer: Buffer): Promise<{ r: number; g: number; b: number }> {
  const meta = await sharp(pngBuffer).metadata();
  const width = meta.width ?? 1;
  const midX = Math.floor(width / 2);
  const { data } = await sharp(pngBuffer)
    .extract({ left: midX, top: 0, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { r: data[0] ?? 0, g: data[1] ?? 0, b: data[2] ?? 0 };
}

function decodeRowIndex(r: number, g: number, b: number): number {
  return r | (g << 8) | (b << 16);
}

function makePageInfo(documentHeight: number): PageInfo {
  return {
    title: "ruler",
    finalUrl: "https://example.com/",
    documentHeight,
    hasHorizontalOverflow: false,
  };
}

describe.each([
  {
    name: "desktop",
    preset: PRESET_DESKTOP,
    blockHeightDevice: 1018,
    chunkHeightDevice: 1018,
    chunksPerBlock: 1,
  },
  {
    name: "tablet",
    preset: PRESET_TABLET,
    blockHeightDevice: 2172,
    chunkHeightDevice: 2172,
    chunksPerBlock: 1,
  },
  {
    name: "mobile",
    preset: PRESET_MOBILE,
    blockHeightDevice: 2206,
    chunkHeightDevice: 1103,
    chunksPerBlock: 2,
  },
])(
  "captureBlocks — ruler verification ($name)",
  ({ preset, blockHeightDevice, chunkHeightDevice, chunksPerBlock }) => {
    const dpr = preset.deviceScaleFactor;
    const chunkWidthDevice = preset.viewport.width * dpr;
    const blocks = 2;
    const totalDeviceRows = blockHeightDevice * blocks;
    const totalCssHeight = totalDeviceRows / dpr;

    it("every chunk has expected dimensions and starts at the correct device row", async () => {
      await withWorkspace(async (ws) => {
        await withBrowser(async (browser) => {
          await withPage(
            browser,
            async ({ page }) => {
              await setRulerPage(page, totalDeviceRows, dpr, chunkWidthDevice);

              const measured = await page.evaluate(() => document.documentElement.scrollHeight);
              expect(measured).toBeGreaterThanOrEqual(totalCssHeight - 2);

              const result = await captureBlocks(
                page,
                preset as ViewportPreset,
                makePageInfo(Math.round(totalCssHeight)),
                ws.path,
              );

              expect(result.chunks).toHaveLength(blocks * chunksPerBlock);
              expect(result.omittedDevicePx).toBe(0);

              for (let i = 0; i < result.chunks.length; i++) {
                const chunk = result.chunks[i];
                if (!chunk) throw new Error(`missing chunk at index ${i}`);

                expect(chunk.widthPx).toBe(chunkWidthDevice);
                expect(chunk.heightPx).toBe(chunkHeightDevice);

                const buf = await readFile(chunk.path);
                const color = await readFirstRowColor(buf);
                const rowIndex = decodeRowIndex(color.r, color.g, color.b);

                const expectedStartRow = i * chunkHeightDevice;
                expect(rowIndex).toBe(expectedStartRow);
              }
            },
            { contextOptions: presetToContextOptions(preset) },
          );
        });
      });
    });
  },
);
