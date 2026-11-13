import { writeFile } from "node:fs/promises";
import type { Page } from "playwright";

export type CaptureResult = {
  readonly path: string;
  readonly bytes: number;
};

/* Captures the entire page as a PNG and writes it to `filePath` */
export async function captureFullPage(page: Page, filePath: string): Promise<CaptureResult> {
  const buffer = await page.screenshot({
    fullPage: true,
    type: "png",
  });

  await writeFile(filePath, buffer);

  return {
    path: filePath,
    bytes: buffer.byteLength,
  };
}
