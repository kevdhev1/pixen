import type { Page } from "playwright";
import type { PageInfo } from "@/pixen/models/index.js";

/* Measures basic page info required by the capture pipeline */
export async function measurePageInfo(page: Page, finalUrl: string): Promise<PageInfo> {
  const measurements = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;

    const documentHeight = Math.max(
      root.scrollHeight,
      root.offsetHeight,
      body?.scrollHeight ?? 0,
      body?.offsetHeight ?? 0,
    );

    const hasHorizontalOverflow = root.scrollWidth > root.clientWidth;

    return {
      title: document.title,
      documentHeight,
      hasHorizontalOverflow,
    };
  });

  return {
    finalUrl,
    ...measurements,
  };
}
