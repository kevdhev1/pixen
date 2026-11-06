import { withBrowser } from "@/pixen/capture/browser.js";
import { measurePageInfo } from "@/pixen/capture/measure.js";
import { navigate } from "@/pixen/capture/navigate.js";
import { withPage } from "@/pixen/capture/page.js";
import { stabilize } from "@/pixen/capture/stabilize.js";
import {
  InMemoryWarningCollector,
  type ReferenceResult,
  type RunOptions,
} from "@/pixen/models/index.js";

/* Orchestrates the capture pipeline for a single run */
export async function generateReference(options: RunOptions): Promise<ReferenceResult> {
  const warnings = new InMemoryWarningCollector();

  const pageInfo = await withBrowser(async (browser) =>
    withPage(browser, async ({ page }) => {
      const nav = await navigate(page, options.url);
      await stabilize(page, warnings);
      return measurePageInfo(page, nav.finalUrl);
    }),
  );

  return {
    url: options.url.href,
    outputDir: options.outputDir,
    presets: options.presetNames,
    pageInfo,
    warnings: warnings.list(),
  };
}
