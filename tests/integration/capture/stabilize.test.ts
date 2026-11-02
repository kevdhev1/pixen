import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withBrowser } from "@/pixen/capture/browser.js";
import { navigate } from "@/pixen/capture/navigate.js";
import { withPage } from "@/pixen/capture/page.js";
import { stabilize } from "@/pixen/capture/stabilize.js";
import { InMemoryWarningCollector } from "@/pixen/models/index.js";
import { type FixturesServer, startFixturesServer } from "../../helpers/fixtures-server.js";

let server: FixturesServer;

beforeAll(async () => {
  server = await startFixturesServer({ slowDelayMs: 500 });
});

afterAll(async () => {
  await server.close();
});

describe("stabilize — no warnings on simple page", () => {
  it("completes without warnings", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        await navigate(page, new URL(`${server.baseUrl}/simple`));
        const warnings = new InMemoryWarningCollector();

        await stabilize(page, warnings);

        expect(warnings.list()).toHaveLength(0);
      });
    });
  });
});

describe("stabilize — lazy loading", () => {
  it("loads all images on a lazy page", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        await navigate(page, new URL(`${server.baseUrl}/lazy`));
        const warnings = new InMemoryWarningCollector();

        await stabilize(page, warnings);

        const allComplete = await page.evaluate(() =>
          Array.from(document.images).every((img) => img.complete),
        );
        expect(allComplete).toBe(true);
      });
    });
  });

  it("warns when step cap is reached", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        await navigate(page, new URL(`${server.baseUrl}/lazy`));
        const warnings = new InMemoryWarningCollector();

        await stabilize(page, warnings, { lazyScrollMaxSteps: 1 });

        const codes = warnings.list().map((w) => w.code);
        expect(codes).toContain("LAZY_LOAD_TIMEOUT");
      });
    });
  });
});

describe("stabilize — fonts", () => {
  it("warns when fonts timeout", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        await navigate(page, new URL(`${server.baseUrl}/simple`));

        // Simulate fonts that never finish loading
        await page.evaluate(() => {
          const neverPromise = new Promise<void>(() => {});
          Object.defineProperty(document.fonts, "ready", {
            configurable: true,
            get: () => neverPromise,
          });
          Object.defineProperty(document.fonts, "status", {
            configurable: true,
            get: () => "loading",
          });
        });

        const warnings = new InMemoryWarningCollector();
        await stabilize(page, warnings, { fontReadyTimeoutMs: 100 });

        const codes = warnings.list().map((w) => w.code);
        expect(codes).toContain("FONT_LOAD_TIMEOUT");
      });
    });
  });
});

describe("stabilize — final state", () => {
  it("applies prefers-reduced-motion", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        await navigate(page, new URL(`${server.baseUrl}/simple`));
        const warnings = new InMemoryWarningCollector();

        await stabilize(page, warnings);

        const matches = await page.evaluate(
          () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        );
        expect(matches).toBe(true);
      });
    });
  });

  it("scrolls back to top", async () => {
    await withBrowser(async (browser) => {
      await withPage(browser, async ({ page }) => {
        await navigate(page, new URL(`${server.baseUrl}/lazy`));

        // Manually scroll down before stabilizing
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

        const warnings = new InMemoryWarningCollector();
        await stabilize(page, warnings);

        expect(await page.evaluate(() => window.scrollY)).toBe(0);
      });
    });
  });
});
