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

const BLOCKS = 2;

// ───────────── Ruler helpers ─────────────
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

  return sharp(buf, { raw: { width: widthDevice, height: totalDeviceRows, channels: 3 } })
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

async function readColumnRowIndices(pngBuffer: Buffer, xDevice: number): Promise<number[]> {
  const meta = await sharp(pngBuffer).metadata();
  const height = meta.height ?? 0;
  const { data, info } = await sharp(pngBuffer)
    .extract({ left: xDevice, top: 0, width: 1, height })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const indices: number[] = [];

  for (let y = 0; y < height; y++) {
    const off = y * channels;
    const r = data[off] ?? 0;
    const g = data[off + 1] ?? 0;
    const b = data[off + 2] ?? 0;
    indices.push(r | (g << 8) | (b << 16));
  }

  return indices;
}

// ───────────── Geometry helpers ─────────────
function gcd(a: number, b: number): number {
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }

  return a;
}

type Geometry = {
  dpr: number;
  chunkWidthDevice: number;
  chunkHeightDevice: number;
  blockHeightCss: number;
  chunksPerBlock: number;
};

function geometryOf(preset: ViewportPreset): Geometry {
  const dpr = preset.deviceScaleFactor;
  const chunkWidthDevice = preset.viewport.width * dpr;
  const aspect = preset.sheetFormat === "A4_LANDSCAPE" ? 297 / 210 : 210 / 297;
  const chunkHeightDevice = Math.round(chunkWidthDevice / aspect);
  const k = dpr / gcd(chunkHeightDevice, dpr);
  const blockHeightCss = (k * chunkHeightDevice) / dpr;

  return { dpr, chunkWidthDevice, chunkHeightDevice, blockHeightCss, chunksPerBlock: k };
}

function makePageInfo(documentHeight: number): PageInfo {
  return {
    title: "ruler",
    finalUrl: "https://example.com/",
    documentHeight,
    hasHorizontalOverflow: false,
  };
}

// ───────────── Test matrix ─────────────
const CASES = [
  { name: "desktop", preset: PRESET_DESKTOP, remainders: [0, 31, 32, 33] },
  { name: "tablet", preset: PRESET_TABLET, remainders: [0, 31, 32, 33] },
  {
    name: "mobile",
    preset: PRESET_MOBILE,
    remainders: [0, 1, 15, 31, 32, 33, 551, 552, 553, 1102],
  },
];

describe.each(CASES)("captureBlocks — continuity ($name)", ({ preset, remainders }) => {
  const geom = geometryOf(preset);

  it.each(remainders)(`remainder %i CSS px on top of ${BLOCKS} blocks`, async (remainderCss) => {
    const totalCss = BLOCKS * geom.blockHeightCss + remainderCss;
    const totalDevice = totalCss * geom.dpr;

    await withWorkspace(async (ws) => {
      await withBrowser(async (browser) => {
        await withPage(
          browser,
          async ({ page }) => {
            await setRulerPage(page, totalDevice, geom.dpr, geom.chunkWidthDevice);

            // Measured height matches the planned height
            const measured = await page.evaluate(() => document.documentElement.scrollHeight);
            expect(measured).toBe(totalCss);

            const result = await captureBlocks(page, preset, makePageInfo(totalCss), ws.path);

            // Structure: chunks and omitted
            let expectedChunkCount: number;
            let expectedOmitted: number;

            if (remainderCss === 0) {
              expectedChunkCount = BLOCKS * geom.chunksPerBlock;
              expectedOmitted = 0;
            } else if (remainderCss < 32) {
              expectedChunkCount = BLOCKS * geom.chunksPerBlock;
              expectedOmitted = remainderCss * geom.dpr;
            } else {
              const partialDevice = remainderCss * geom.dpr;
              const nFull = Math.floor(partialDevice / geom.chunkHeightDevice);
              const r = partialDevice - nFull * geom.chunkHeightDevice;
              const keepRemainder = r >= 32 * geom.dpr && r > 0;

              expectedChunkCount = BLOCKS * geom.chunksPerBlock + nFull + (keepRemainder ? 1 : 0);
              expectedOmitted = keepRemainder ? 0 : r;
            }

            expect(result.chunks.length).toBe(expectedChunkCount);
            expect(result.omittedDevicePx).toBe(expectedOmitted);

            // Reconstruct the full row sequence across chunks
            const rows: number[] = [];

            for (const chunk of result.chunks) {
              const buf = await readFile(chunk.path);
              const midX = Math.floor(chunk.widthPx / 2);
              const chunkRows = await readColumnRowIndices(buf, midX);
              rows.push(...chunkRows);
            }

            // Contiguous from 0, no duplicates, no gaps
            for (let i = 0; i < rows.length; i++) {
              expect(rows[i]).toBe(i);
            }

            // Conserved + omitted = total page device rows
            expect(rows.length + result.omittedDevicePx).toBe(totalDevice);

            // Last partial block: last chunk has the expected height
            if (remainderCss >= 32) {
              const partialDevice = remainderCss * geom.dpr;
              const nFull = Math.floor(partialDevice / geom.chunkHeightDevice);
              const r = partialDevice - nFull * geom.chunkHeightDevice;
              const keepRemainder = r >= 32 * geom.dpr && r > 0;
              const expectedLastHeight = keepRemainder ? r : geom.chunkHeightDevice;
              const lastChunk = result.chunks[result.chunks.length - 1];
              expect(lastChunk?.heightPx).toBe(expectedLastHeight);
            }
          },
          { contextOptions: presetToContextOptions(preset) },
        );
      });
    });
  });
});
