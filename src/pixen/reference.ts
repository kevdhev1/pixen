import { withBrowser } from "@/pixen/capture/browser.js";
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

/*
 * Runs the pipeline once per requested preset, sequentially.
 *
 * Design choices:
 * - One browser for the whole run (heavy to launch, expensive in memory).
 * - One fresh context per preset: isolates cookies/storage/cache and applies
 *   each preset's viewport, DPR, and mobile emulation at the context level.
 * - Sequential iteration: Chromium already uses significant CPU/memory per
 *   render; parallel presets would add risk without measurement.
 * - Errors abort the run: if one preset fails, the remaining presets are not
 *   attempted. `withBrowser` closes the browser regardless.
 */
export async function generateReference(options: RunOptions): Promise<ReferenceResult> {
  const warnings = new InMemoryWarningCollector();

  const results = await withBrowser(async (browser) => {
    const acc: PresetResult[] = [];

    for (const presetName of options.presetNames) {
      const preset = PRESETS_BY_NAME[presetName];
      const contextOptions = presetToContextOptions(preset);

      const pageInfo = await withPage(
        browser,
        async ({ page }) => {
          const nav = await navigate(page, options.url);
          await stabilize(page, warnings);

          const measured = await measureLayoutWidth(page);
          const overflowWarning = buildOverflowWarning(
            preset.name,
            preset.viewport.width,
            measured,
          );
          if (overflowWarning) {
            warnings.add(overflowWarning);
          }

          return measurePageInfo(page, nav.finalUrl);
        },
        { contextOptions },
      );

      acc.push({ preset: preset.name, pageInfo });
    }

    return acc;
  });

  return {
    url: options.url.href,
    outputDir: options.outputDir,
    results,
    warnings: warnings.list(),
  };
}
