import { writeFile } from "node:fs/promises";
import type { Page } from "playwright";
import sharp from "sharp";
import { PixenError } from "@/pixen/models/index.js";

export type CaptureResult = {
  readonly path: string;
  readonly bytes: number;
  readonly width: number;
  readonly height: number;
};

/* Tolerance in pixels for the height check */
const HEIGHT_TOLERANCE_PX = 2;

export type CaptureExpectations = {
  /** Viewport width in CSS pixels. Used to crop the capture horizontally. */
  readonly viewportWidthCss: number;
  /** Document height in CSS pixels. Used to crop the capture vertically. */
  readonly documentHeightCss: number;
  /** Device pixel ratio, from the preset. */
  readonly deviceScaleFactor: number;
};

/*
 * Captures the page as a PNG and writes it to `filePath`, then verifies the
 * resulting dimensions against the expectations.
 */
export async function captureFullPage(
  page: Page,
  filePath: string,
  expectations: CaptureExpectations,
): Promise<CaptureResult> {
  const fullBuffer = await page.screenshot({
    fullPage: true,
    type: "png",
    caret: "hide",
    animations: "disabled",
    scale: "device",
  });

  const fullMeta = await sharp(fullBuffer).metadata();
  const fullWidth = fullMeta.width ?? 0;
  const fullHeight = fullMeta.height ?? 0;

  const expectedWidth = expectations.viewportWidthCss * expectations.deviceScaleFactor;
  const expectedHeight = expectations.documentHeightCss * expectations.deviceScaleFactor;

  if (fullWidth < expectedWidth) {
    throw new PixenError(
      "CAPTURE_FAILED",
      `Capture width smaller than expected: expected ${expectedWidth}px, got ${fullWidth}px.`,
      { context: { path: filePath, expectedWidth, actualWidth: fullWidth } },
    );
  }

  if (fullHeight < expectedHeight - HEIGHT_TOLERANCE_PX) {
    throw new PixenError(
      "CAPTURE_FAILED",
      `Capture height smaller than expected: expected ~${expectedHeight}px, got ${fullHeight}px.`,
      {
        context: {
          path: filePath,
          expectedHeight,
          actualHeight: fullHeight,
          tolerance: HEIGHT_TOLERANCE_PX,
        },
      },
    );
  }

  const cropHeight = Math.min(fullHeight, expectedHeight);

  const croppedBuffer = await sharp(fullBuffer)
    .extract({ left: 0, top: 0, width: expectedWidth, height: cropHeight })
    .png()
    .toBuffer();

  await writeFile(filePath, croppedBuffer);

  const croppedMeta = await sharp(croppedBuffer).metadata();

  return {
    path: filePath,
    bytes: croppedBuffer.byteLength,
    width: croppedMeta.width ?? 0,
    height: croppedMeta.height ?? 0,
  };
}
