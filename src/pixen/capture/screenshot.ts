import type { Page } from "playwright";

/* Takes a single full-page screenshot and returns it as a PNG buffer */
export async function takeFullPageScreenshot(page: Page): Promise<Buffer> {
  return page.screenshot({
    fullPage: true,
    type: "png",
    caret: "hide",
    animations: "disabled",
    scale: "device",
  });
}
