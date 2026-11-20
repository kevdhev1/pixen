import { describe, expect, it } from "vitest";
import { withBrowser } from "@/pixen/capture/browser.js";
import { withPage } from "@/pixen/capture/page.js";
import { presetToContextOptions } from "@/pixen/capture/viewport.js";
import {
  PRESET_DESKTOP,
  PRESET_MOBILE,
  PRESET_TABLET,
  type ViewportPreset,
} from "@/pixen/models/index.js";

async function readBrowserState(preset: ViewportPreset): Promise<{
  innerWidth: number;
  innerHeight: number;
  dpr: number;
  ua: string;
  maxTouchPoints: number;
}> {
  let state: Awaited<ReturnType<typeof readBrowserState>> | undefined;

  await withBrowser(async (browser) => {
    await withPage(
      browser,
      async ({ page }) => {
        await page.setContent(`
          <!doctype html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body></body>
          </html>
        `);
        state = await page.evaluate(() => ({
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          dpr: window.devicePixelRatio,
          ua: navigator.userAgent,
          maxTouchPoints: navigator.maxTouchPoints,
        }));
      },
      { contextOptions: presetToContextOptions(preset) },
    );
  });

  if (!state) throw new Error("state was not captured");
  return state;
}

describe("viewport context — desktop", () => {
  it("viewport dimensions match the preset in the real browser", async () => {
    const s = await readBrowserState(PRESET_DESKTOP);
    expect(s.innerWidth).toBe(PRESET_DESKTOP.viewport.width);
    expect(s.innerHeight).toBe(PRESET_DESKTOP.viewport.height);
  });

  it("device pixel ratio matches the preset", async () => {
    const s = await readBrowserState(PRESET_DESKTOP);
    expect(s.dpr).toBe(PRESET_DESKTOP.deviceScaleFactor);
  });

  it("uses a non-mobile UA and no touch support", async () => {
    const s = await readBrowserState(PRESET_DESKTOP);
    expect(s.ua).not.toContain("Android");
    expect(s.ua).not.toContain("Mobile");
    expect(s.maxTouchPoints).toBe(0);
  });
});

describe("viewport context — tablet", () => {
  it("viewport dimensions match the preset in the real browser", async () => {
    const s = await readBrowserState(PRESET_TABLET);
    expect(s.innerWidth).toBe(PRESET_TABLET.viewport.width);
    expect(s.innerHeight).toBe(PRESET_TABLET.viewport.height);
  });

  it("device pixel ratio matches the preset", async () => {
    const s = await readBrowserState(PRESET_TABLET);
    expect(s.dpr).toBe(PRESET_TABLET.deviceScaleFactor);
  });

  it("uses an Android Chrome UA with touch support", async () => {
    const s = await readBrowserState(PRESET_TABLET);
    expect(s.ua).toContain("Android");
    expect(s.ua).toContain("Chrome");
    expect(s.maxTouchPoints).toBeGreaterThan(0);
  });
});

describe("viewport context — mobile", () => {
  it("viewport dimensions match the preset in the real browser", async () => {
    const s = await readBrowserState(PRESET_MOBILE);
    expect(s.innerWidth).toBe(PRESET_MOBILE.viewport.width);
    expect(s.innerHeight).toBe(PRESET_MOBILE.viewport.height);
  });

  it("device pixel ratio matches the preset", async () => {
    const s = await readBrowserState(PRESET_MOBILE);
    expect(s.dpr).toBe(PRESET_MOBILE.deviceScaleFactor);
  });

  it("uses an Android Chrome UA with touch support", async () => {
    const s = await readBrowserState(PRESET_MOBILE);
    expect(s.ua).toContain("Android");
    expect(s.ua).toContain("Chrome");
    expect(s.maxTouchPoints).toBeGreaterThan(0);
  });
});
