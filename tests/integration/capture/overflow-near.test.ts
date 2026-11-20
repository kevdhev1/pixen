import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withBrowser } from "@/pixen/capture/browser.js";
import { buildOverflowWarning, measureLayoutWidth } from "@/pixen/capture/layout-width.js";
import { navigate } from "@/pixen/capture/navigate.js";
import { withPage } from "@/pixen/capture/page.js";
import { presetToContextOptions } from "@/pixen/capture/viewport.js";
import { PRESET_MOBILE } from "@/pixen/models/index.js";
import { type FixturesServer, startFixturesServer } from "../../helpers/fixtures-server.js";

let server: FixturesServer;

beforeAll(async () => {
  server = await startFixturesServer();
});

afterAll(async () => {
  await server.close();
});

describe("overflow near viewport edge — mobile", () => {
  it("detects the overflow and warns with preset + requested + measured", async () => {
    await withBrowser(async (browser) => {
      await withPage(
        browser,
        async ({ page }) => {
          await navigate(page, new URL(`${server.baseUrl}/overflow-near`));
          const m = await measureLayoutWidth(page);

          // In mobile emulation, `window.innerWidth` reflects the layout
          // viewport, which Chromium expands to fit overflowing content.
          // So it can be larger than the declared 390px. We only assert
          // that the measured layout exceeds the preset and stays within
          // a reasonable bound around the 420px content width.
          expect(m.innerWidth).toBeGreaterThanOrEqual(390);
          expect(m.layoutWidth).toBeGreaterThan(390);
          expect(m.layoutWidth).toBeLessThanOrEqual(425);

          const warning = buildOverflowWarning("mobile", PRESET_MOBILE.viewport.width, m);
          expect(warning).not.toBeNull();

          if (!warning) throw new Error("expected warning");

          expect(warning.code).toBe("HORIZONTAL_OVERFLOW");
          expect(warning.data).toMatchObject({ preset: "mobile", requestedWidth: 390 });
          expect(warning.data.measuredWidth).toBeGreaterThan(390);
        },
        { contextOptions: presetToContextOptions(PRESET_MOBILE) },
      );
    });
  });
});
