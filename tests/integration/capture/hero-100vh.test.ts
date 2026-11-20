import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withBrowser } from "@/pixen/capture/browser.js";
import { navigate } from "@/pixen/capture/navigate.js";
import { withPage } from "@/pixen/capture/page.js";
import { presetToContextOptions } from "@/pixen/capture/viewport.js";
import { PRESETS, type ViewportPreset } from "@/pixen/models/index.js";
import { type FixturesServer, startFixturesServer } from "../../helpers/fixtures-server.js";

let server: FixturesServer;

beforeAll(async () => {
  server = await startFixturesServer();
});

afterAll(async () => {
  await server.close();
});

describe.each(PRESETS.map((p) => [p.name, p] as const))(
  "hero 100vh — %s",
  (_name, preset: ViewportPreset) => {
    it(`measures exactly the preset viewport height (${preset.viewport.height}px)`, async () => {
      await withBrowser(async (browser) => {
        await withPage(
          browser,
          async ({ page }) => {
            await navigate(page, new URL(`${server.baseUrl}/hero-100vh`));
            const heroHeight = await page.evaluate(
              () => document.querySelector<HTMLElement>(".hero")?.offsetHeight ?? 0,
            );
            expect(heroHeight).toBe(preset.viewport.height);
          },
          { contextOptions: presetToContextOptions(preset) },
        );
      });
    });
  },
);
