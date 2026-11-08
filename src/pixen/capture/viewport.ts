import { devices } from "playwright";
import type { ViewportPreset } from "@/pixen/models/index.js";

/**
 * Options passed to `browser.newContext()`. Only the fields we set
 * explicitly; Playwright fills the rest with its defaults.
 */
export type ContextOptions = {
  readonly viewport: { readonly width: number; readonly height: number };
  readonly screen: { readonly width: number; readonly height: number };
  readonly deviceScaleFactor: number;
  readonly userAgent?: string;
  readonly isMobile?: boolean;
  readonly hasTouch?: boolean;
};

/* Playwright device descriptors used as the base for each non-desktop preset */
const DESCRIPTOR_NAMES = { tablet: "Galaxy Tab S9", mobile: "Pixel 7" } as const;

/* Maps a ViewportPreset to Playwright context options */
export function presetToContextOptions(preset: ViewportPreset): ContextOptions {
  const base: ContextOptions = {
    viewport: {
      width: preset.viewport.width,
      height: preset.viewport.height,
    },
    screen: {
      width: preset.viewport.width,
      height: preset.viewport.height,
    },
    deviceScaleFactor: preset.deviceScaleFactor,
  };

  if (preset.name === "desktop") {
    return base;
  }

  const descriptorName = DESCRIPTOR_NAMES[preset.name];
  const descriptor = devices[descriptorName];

  if (!descriptor) {
    throw new Error(
      `Playwright device descriptor "${descriptorName}" was not found. ` +
      `This usually means the installed Playwright version differs from ` +
      `the one the preset was designed against.`,
    );
  }

  return {
    ...base,
    userAgent: descriptor.userAgent,
    isMobile: descriptor.isMobile ?? false,
    hasTouch: descriptor.hasTouch ?? false,
  };
}
