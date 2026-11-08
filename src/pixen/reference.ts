import { withBrowser } from "@/pixen/capture/browser.js";
import { buildOverflowWarning, measureLayoutWidth } from "@/pixen/capture/layout-width.js";
import { measurePageInfo } from "@/pixen/capture/measure.js";
import { navigate } from "@/pixen/capture/navigate.js";
import { withPage } from "@/pixen/capture/page.js";
import { stabilize } from "@/pixen/capture/stabilize.js";
import { presetToContextOptions } from "@/pixen/capture/viewport.js";
import {
  InMemoryWarningCollector,
  PRESET_DESKTOP,
  type ReferenceResult,
  type RunOptions,
} from "@/pixen/models/index.js";

/* Orchestrates the capture pipeline for a single run */
export async function generateReference(options: RunOptions): Promise<ReferenceResult> {
  const warnings = new InMemoryWarningCollector();

  const preset = PRESET_DESKTOP;
  const contextOptions = presetToContextOptions(preset);

  const pageInfo = await withBrowser(async (browser) =>
    withPage(
      browser,
      async ({ page }) => {
        const nav = await navigate(page, options.url);
        await stabilize(page, warnings);

        const measured = await measureLayoutWidth(page);
        const overflowWarning = buildOverflowWarning(preset.name, preset.viewport.width, measured);

        if (overflowWarning) {
          warnings.add(overflowWarning);
        }

        return measurePageInfo(page, nav.finalUrl);
      },
      { contextOptions },
    ),
  );

  return {
    url: options.url.href,
    outputDir: options.outputDir,
    presets: options.presetNames,
    pageInfo,
    warnings: warnings.list(),
  };
}
