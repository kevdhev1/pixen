import path from "node:path";
import { performance } from "node:perf_hooks";
import { withBrowser } from "@/pixen/capture/browser.js";
import { buildOverflowWarning, measureLayoutWidth } from "@/pixen/capture/layout-width.js";
import { measurePageInfo } from "@/pixen/capture/measure.js";
import { navigate } from "@/pixen/capture/navigate.js";
import { withPage } from "@/pixen/capture/page.js";
import { captureFullPage } from "@/pixen/capture/screenshot.js";
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

/* Runs the pipeline once per requested preset, sequentially */
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
            const captured = await captureFullPage(page, path.join(ws.path, `${preset.name}.png`), {
              viewportWidthCss: preset.viewport.width,
              documentHeightCss: info.documentHeight,
              deviceScaleFactor: preset.deviceScaleFactor,
            });

            return { pageInfo: info, capture: captured };
          },
          { contextOptions },
        );

        const elapsedMs = Math.round(performance.now() - start);

        acc.push({
          preset: preset.name,
          pageInfo: presetData.pageInfo,
          capturedBytes: presetData.capture.bytes,
          capturedWidthPx: presetData.capture.width,
          capturedHeightPx: presetData.capture.height,
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
