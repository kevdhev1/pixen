import type { Browser } from "playwright";
import { chromium } from "playwright";

/*
 * Runs `fn` with a headless Chromium instance, guaranteeing the browser is
 * closed afterwards, whether `fn` succeeds or throws.
 */
export async function withBrowser<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
  const browser = await chromium.launch({ headless: true });

  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}
