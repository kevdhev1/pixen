import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { Browser } from "playwright";
import { chromium } from "playwright";
import { PixenError } from "@/pixen/models/index.js";

/* Returns the installed Playwright version, read from its own package.json */
function getPlaywrightVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkgPath = require.resolve("playwright/package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };
    return pkg.version;
  } catch {
    return "unknown";
  }
}

function buildNotInstalledMessage(): string {
  const version = getPlaywrightVersion();
  return [
    `Chromium is not installed for Playwright ${version}.`,
    "",
    "Install it with:",
    "  pnpm exec playwright install chromium",
    "",
    "On Linux, if system libraries are also missing:",
    "  pnpm exec playwright install --with-deps chromium",
  ].join("\n");
}

/* Returns true if the Chromium binary that Playwright expects is present on disk */
function isChromiumInstalled(): boolean {
  try {
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
}

/* Detects the specific Playwright error thrown when the executable is missing */
function isMissingExecutableError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("Executable doesn't exist");
}

/*
 * Runs `fn` with a headless Chromium instance, guaranteeing the browser is
 * closed afterwards, whether `fn` succeeds or throws.
 */
export async function withBrowser<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
  if (!isChromiumInstalled()) {
    throw new PixenError("BROWSER_NOT_INSTALLED", buildNotInstalledMessage());
  }

  let browser: Browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (cause) {
    if (isMissingExecutableError(cause)) {
      throw new PixenError("BROWSER_NOT_INSTALLED", buildNotInstalledMessage(), {
        cause,
      });
    }
    throw new PixenError("BROWSER_LAUNCH_FAILED", "Failed to launch Chromium.", {
      cause,
    });
  }

  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}
