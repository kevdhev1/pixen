import type { Page } from "playwright";
import type { WarningCollector } from "@/pixen/models/index.js";

/* Bounded stabilization waits */
export const FONT_READY_TIMEOUT_MS = 3_000;
export const LAZY_SCROLL_STEP_DELAY_MS = 100;
export const LAZY_SCROLL_MAX_DURATION_MS = 15_000;
export const LAZY_SCROLL_MAX_STEPS = 50;
export const IMAGES_LOADING_TIMEOUT_MS = 2_000;
export const NETWORK_IDLE_TIMEOUT_MS = 2_000;
export const FINAL_REPOSE_MS = 300;

export type StabilizeOptions = {
  readonly fontReadyTimeoutMs?: number;
  readonly lazyScrollStepDelayMs?: number;
  readonly lazyScrollMaxDurationMs?: number;
  readonly lazyScrollMaxSteps?: number;
  readonly imagesLoadingTimeoutMs?: number;
  readonly networkIdleTimeoutMs?: number;
  readonly finalReposeMs?: number;
};

/**
 * Runs the stabilization sequence. Order matters:
 *
 * 1. Fonts ready: before scrolling, so layout is stable.
 * 2. Lazy scroll: triggers deferred image loads; stops when height stops
 *    growing or a distance/time cap is hit (infinite-scroll protection).
 * 3. Network quiet: best effort only, short cap.
 * 4. Reduced motion: affects subsequent CSS animations and transitions.
 * 5. Final repose: last-resort pause for transitions, documented as such.
 * 6. Scroll to top: sticky/fixed elements return to their initial position.
 *
 * Optional steps (fonts, lazy scroll) emit warnings on timeout instead of
 * failing. The caller decides what to do with the warnings.
 */
export async function stabilize(
  page: Page,
  warnings: WarningCollector,
  options: StabilizeOptions = {},
): Promise<void> {
  const fontReadyTimeoutMs = options.fontReadyTimeoutMs ?? FONT_READY_TIMEOUT_MS;
  const lazyScrollStepDelayMs = options.lazyScrollStepDelayMs ?? LAZY_SCROLL_STEP_DELAY_MS;
  const lazyScrollMaxDurationMs = options.lazyScrollMaxDurationMs ?? LAZY_SCROLL_MAX_DURATION_MS;
  const lazyScrollMaxSteps = options.lazyScrollMaxSteps ?? LAZY_SCROLL_MAX_STEPS;
  const imagesLoadingTimeoutMs = options.imagesLoadingTimeoutMs ?? IMAGES_LOADING_TIMEOUT_MS;
  const networkIdleTimeoutMs = options.networkIdleTimeoutMs ?? NETWORK_IDLE_TIMEOUT_MS;
  const finalReposeMs = options.finalReposeMs ?? FINAL_REPOSE_MS;

  await waitForFonts(page, warnings, fontReadyTimeoutMs);

  await scrollForLazyLoading(page, warnings, {
    stepDelayMs: lazyScrollStepDelayMs,
    maxDurationMs: lazyScrollMaxDurationMs,
    maxSteps: lazyScrollMaxSteps,
    imagesTimeoutMs: imagesLoadingTimeoutMs,
  });

  await waitForNetworkQuiet(page, networkIdleTimeoutMs);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(finalReposeMs);
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function waitForFonts(
  page: Page,
  warnings: WarningCollector,
  timeoutMs: number,
): Promise<void> {
  try {
    await page.waitForFunction(() => document.fonts.status === "loaded", {
      timeout: timeoutMs,
    });
  } catch {
    warnings.add({
      code: "FONT_LOAD_TIMEOUT",
      message: `Fonts did not finish loading within ${timeoutMs}ms.`,
      data: { timeoutMs },
    });
  }
}

type ScrollOpts = {
  stepDelayMs: number;
  maxDurationMs: number;
  maxSteps: number;
  imagesTimeoutMs: number;
};

async function scrollForLazyLoading(
  page: Page,
  warnings: WarningCollector,
  opts: ScrollOpts,
): Promise<void> {
  const startTime = Date.now();
  let step = 0;
  let lastPageHeight = 0;

  while (true) {
    if (step >= opts.maxSteps) {
      warnings.add({
        code: "LAZY_LOAD_TIMEOUT",
        message: `Lazy scroll hit step cap (${opts.maxSteps} steps).`,
        data: { steps: step, maxSteps: opts.maxSteps },
      });
      return;
    }

    const elapsed = Date.now() - startTime;
    if (elapsed > opts.maxDurationMs) {
      warnings.add({
        code: "LAZY_LOAD_TIMEOUT",
        message: `Lazy scroll hit time cap (${opts.maxDurationMs}ms).`,
        data: { elapsedMs: elapsed, maxDurationMs: opts.maxDurationMs },
      });
      return;
    }

    const before = await page.evaluate(() => ({
      scrollY: window.scrollY,
      viewportHeight: window.innerHeight,
      pageHeight: document.documentElement.scrollHeight,
    }));

    const atBottom = before.scrollY + before.viewportHeight >= before.pageHeight;
    if (atBottom && before.pageHeight <= lastPageHeight) {
      return;
    }
    lastPageHeight = before.pageHeight;

    const after = await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
      return window.scrollY;
    });

    if (after === before.scrollY) {
      return;
    }
    step++;

    await page.waitForTimeout(opts.stepDelayMs);
    await waitForVisibleImages(page, opts.imagesTimeoutMs);
  }
}

async function waitForVisibleImages(page: Page, timeoutMs: number): Promise<void> {
  try {
    await page.evaluate(async (timeout) => {
      const images = Array.from(document.images).filter((img) => {
        const rect = img.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });

      const pending = images.filter((img) => !img.complete);
      if (pending.length === 0) {
        return;
      }

      await Promise.race([
        Promise.all(
          pending.map(
            (img) =>
              new Promise<void>((resolve) => {
                img.addEventListener("load", () => resolve(), { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
              }),
          ),
        ),
        new Promise<void>((resolve) => setTimeout(resolve, timeout)),
      ]);
    }, timeoutMs);
  } catch {
    // Best effort: image waits are not fatal.
  }
}

async function waitForNetworkQuiet(page: Page, timeoutMs: number): Promise<void> {
  try {
    await page.waitForLoadState("networkidle", { timeout: timeoutMs });
  } catch {
    // Best effort only: webs with analytics, polling, or websockets never
    // reach "networkidle". We cap the wait and move on.
  }
}
