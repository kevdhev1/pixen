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

describe.each([
  {
    name: "desktop",
    preset: PRESET_DESKTOP,
  },
  {
    name: "tablet",
    preset: PRESET_TABLET,
  },
  {
    name: "mobile",
    preset: PRESET_MOBILE,
  },
])("captureBlocks — ruler verification ($name)", ({ preset }) => {
  const geom = geometryOf(preset);
  const blocks = 2;
  const totalDeviceRows = geom.chunkHeightDevice * geom.chunksPerBlock * blocks;
  const totalCssHeight = totalDeviceRows / geom.dpr;

  it("every chunk has expected dimensions and starts at the correct device row", async () => {
    await withWorkspace(async (ws) => {
      await withBrowser(async (browser) => {
        await withPage(
          browser,
          async ({ page }) => {
            await setRulerPage(page, totalDeviceRows, geom.dpr, geom.chunkWidthDevice);

            const measured = await page.evaluate(() => document.documentElement.scrollHeight);
            expect(measured).toBeGreaterThanOrEqual(totalCssHeight - 2);

            const result = await captureBlocks(
              page,
              preset,
              makePageInfo(Math.round(totalCssHeight)),
              ws.path,
            );

            expect(result.chunks).toHaveLength(blocks * geom.chunksPerBlock);
            expect(result.omittedDevicePx).toBe(0);

            for (let i = 0; i < result.chunks.length; i++) {
              const chunk = result.chunks[i];
              if (!chunk) throw new Error(`missing chunk at index ${i}`);

              expect(chunk.widthPx).toBe(geom.chunkWidthDevice);
              expect(chunk.heightPx).toBe(geom.chunkHeightDevice);

              const buf = await readFile(chunk.path);
              const midX = Math.floor(chunk.widthPx / 2);
              const rows = await readRowIndices(buf, midX);
              const firstRowIndex = rows[0];

              const expectedStartRow = i * geom.chunkHeightDevice;
              expect(firstRowIndex).toBe(expectedStartRow);
            }
          },
          { contextOptions: presetToContextOptions(preset) },
        );
      });
    });
  });
});
