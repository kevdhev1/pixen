import { performance } from "node:perf_hooks";
import { withBrowser } from "@/pixen/capture/browser.js";
import { captureBlocks } from "@/pixen/capture/capture-blocks.js";
import { buildOverflowWarning, measureLayoutWidth } from "@/pixen/capture/layout-width.js";
import { measurePageInfo } from "@/pixen/capture/measure.js";
import { navigate } from "@/pixen/capture/navigate.js";
import { withPage } from "@/pixen/capture/page.js";
import { stabilize } from "@/pixen/capture/stabilize.js";
import { presetToContextOptions } from "@/pixen/capture/viewport.js";
import {
  InMemoryWarningCollector,
  PRESETS_BY_NAME,
  type PresetResult,
  type ReferenceResult,
  type RunOptions,
} from "@/pixen/models/index.js";
import { withWorkspace } from "@/pixen/workspace.js";

export async function generateReference(options: RunOptions): Promise<ReferenceResult> {
  return withWorkspace(async (ws) => {
    const results = await withBrowser(async (browser) => {
      const acc: PresetResult[] = [];

      for (const presetName of options.presetNames) {
        const preset = PRESETS_BY_NAME[presetName];
        const contextOptions = presetToContextOptions(preset);
        const presetWarnings = new InMemoryWarningCollector();
        const start = performance.now();

        const presetData = await withPage(
          browser,
          async ({ page }) => {
            const nav = await navigate(page, options.url);
            await stabilize(page, presetWarnings);

            const measured = await measureLayoutWidth(page);
            const overflowWarning = buildOverflowWarning(
              preset.name,
              preset.viewport.width,
              measured,
            );
            if (overflowWarning) {
              presetWarnings.add(overflowWarning);
            }

            const info = await measurePageInfo(page, nav.finalUrl);
            const captured = await captureBlocks(page, preset, info, ws.path);

            return { pageInfo: info, captured };
          },
          { contextOptions },
        );

        const elapsedMs = Math.round(performance.now() - start);

        acc.push({
          preset: preset.name,
          pageInfo: presetData.pageInfo,
          capturedWidthPx: preset.viewport.width * preset.deviceScaleFactor,
          capturedHeightPx: presetData.pageInfo.documentHeight * preset.deviceScaleFactor,
          chunks: presetData.captured.chunks,
          omittedDevicePx: presetData.captured.omittedDevicePx,
          elapsedMs,
          warnings: presetWarnings.list(),
        });
      }

      return acc;
    });

    const allWarnings = results.flatMap((r) => r.warnings);

    return {
      url: options.url.href,
      outputDir: options.outputDir,
      results,
      warnings: allWarnings,
    };
  });
}
