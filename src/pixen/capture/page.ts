import type { Browser, BrowserContext, Page } from "playwright";
import type { ContextOptions } from "@/pixen/capture/viewport.js";

/* Timeouts in milliseconds. Every wait in Pixen is bounded by these */
export const NAVIGATION_TIMEOUT_MS = 30_000;
export const WAIT_TIMEOUT_MS = 5_000;

/* What the callback receives: an open page and its parent context */
export type PageScope = {
  readonly page: Page;
  readonly context: BrowserContext;
};

/* Optional overrides. Only meant for testing */
export type WithPageOptions = {
  readonly navigationTimeoutMs?: number;
  readonly waitTimeoutMs?: number;
  readonly contextOptions?: ContextOptions;
};

/*
 * Runs `fn` with a fresh browser context and page, guaranteeing the context
 * is closed afterwards (success or error).
 */
export async function withPage<T>(
  browser: Browser,
  fn: (scope: PageScope) => Promise<T>,
  options: WithPageOptions = {},
): Promise<T> {
  const navigationTimeoutMs = options.navigationTimeoutMs ?? NAVIGATION_TIMEOUT_MS;
  const waitTimeoutMs = options.waitTimeoutMs ?? WAIT_TIMEOUT_MS;

  const context = await browser.newContext(options.contextOptions ?? {});

  let result: T;
  try {
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(navigationTimeoutMs);
    page.setDefaultTimeout(waitTimeoutMs);

    result = await fn({ page, context });
  } catch (err) {
    try {
      await context.close();
    } catch {
      // Preserves the original error from `fn` (or from newPage /
      // setDefaultTimeout). The context close is best-effort here.
    }
    throw err;
  }

  await context.close();
  return result;
}
