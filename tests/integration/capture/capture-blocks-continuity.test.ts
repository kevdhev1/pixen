import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { geometryOf, makePageInfo } from "@/../tests/helpers/geometry.js";
import { readRowIndices, setRulerPage } from "@/../tests/helpers/ruler.js";
import { withBrowser } from "@/pixen/capture/browser.js";
import { captureBlocks } from "@/pixen/capture/capture-blocks.js";
import { withPage } from "@/pixen/capture/page.js";
import { presetToContextOptions } from "@/pixen/capture/viewport.js";
import { PRESET_DESKTOP, PRESET_MOBILE, PRESET_TABLET } from "@/pixen/models/index.js";
import { withWorkspace } from "@/pixen/workspace.js";

const BLOCKS = 2;

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

  it.each(remainders)("remainder %i CSS px", async (remainderCss) => {
    const totalCss = BLOCKS * geom.blockHeightCss + remainderCss;
    const totalDevice = totalCss * geom.dpr;

    await withWorkspace(async (ws) => {
      await withBrowser(async (browser) => {
        await withPage(
          browser,
          async ({ page }) => {
            await setRulerPage(page, totalDevice, geom.dpr, geom.chunkWidthDevice);

            const measured = await page.evaluate(() => document.documentElement.scrollHeight);
            expect(measured).toBe(totalCss);

            const result = await captureBlocks(page, preset, makePageInfo(totalCss), ws.path);

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

            const rows: number[] = [];
            for (const chunk of result.chunks) {
              const buf = await readFile(chunk.path);
              const midX = Math.floor(chunk.widthPx / 2);
              const chunkRows = await readRowIndices(buf, midX);

              rows.push(...chunkRows);
            }

            for (let i = 0; i < rows.length; i++) {
              expect(rows[i]).toBe(i);
            }

            expect(rows.length + result.omittedDevicePx).toBe(totalDevice);

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
