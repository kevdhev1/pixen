import type { Page } from "playwright";
import type { PixenWarning, PresetName } from "@/pixen/models/index.js";

/*
 * Raw measurements from the browser, plus the derived layout width.
 *
 * `layoutWidth` is the effective horizontal extent of the layout: the wider
 * of the viewport (`innerWidth`) and the content (`scrollWidth`). If a page
 * overflows, `layoutWidth > innerWidth`.
 *
 * `clientWidth` is intentionally NOT used: in the mobile emulation trial it
 * remained at 390 even when content overflowed, so it does not detect the
 * real layout width.
 */
export type LayoutWidthMeasurement = {
  readonly innerWidth: number;
  readonly scrollWidth: number;
  readonly layoutWidth: number;
};

export function computeLayoutWidth(
  innerWidth: number,
  scrollWidth: number,
): LayoutWidthMeasurement {
  if (innerWidth <= 0) {
    throw new Error(`innerWidth must be positive, got ${innerWidth}`);
  }
  if (scrollWidth < 0) {
    throw new Error(`scrollWidth must be non-negative, got ${scrollWidth}`);
  }

  return { innerWidth, scrollWidth, layoutWidth: Math.max(innerWidth, scrollWidth) };
}

/* Builds a warning if the measured layout width exceeds the preset width */
export function buildOverflowWarning(
  presetName: PresetName,
  presetWidth: number,
  measured: LayoutWidthMeasurement,
): PixenWarning | null {
  if (measured.layoutWidth <= presetWidth) {
    return null;
  }

  return {
    code: "HORIZONTAL_OVERFLOW",
    message: [
      `Horizontal overflow on ${presetName}:`,
      `requested ${presetWidth}px, measured ${measured.layoutWidth}px.`,
      `The right edge may be clipped.`,
    ].join(" "),
    data: {
      preset: presetName,
      requestedWidth: presetWidth,
      measuredWidth: measured.layoutWidth,
    },
  };
}

export async function measureLayoutWidth(page: Page): Promise<LayoutWidthMeasurement> {
  const raw = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  return computeLayoutWidth(raw.innerWidth, raw.scrollWidth);
}
