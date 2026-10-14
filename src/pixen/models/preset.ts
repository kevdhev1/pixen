/*
 * PDF page format
 * Determines the aspect ratio for proportional pagination.
 *
 * - A4_LANDSCAPE: 297mm × 210mm (Desktop)
 * - A4_PORTRAIT:  210mm × 297mm (Tablet & Mobile)
 */
export type SheetFormat = "A4_LANDSCAPE" | "A4_PORTRAIT";

/* Viewport for a preset. Values are in CSS pixels. */

export type Viewport = {
  width: number;
  height: number;
};

/* Flags passed to the Playwright context. */

export type DeviceHints = {
  isMobile: boolean;
  hasTouch: boolean;
  isLandscape: boolean;
};

/* Complete capture preset. */

export type ViewportPreset = {
  readonly name: PresetName;
  readonly viewport: Viewport;
  readonly deviceScaleFactor: number;
  readonly deviceHints: DeviceHints;
  readonly sheetFormat: SheetFormat;
};

export type PresetName = "desktop" | "tablet" | "mobile";

// ─────────────────────────────────────────────────────────────────
// Default presets.
// ─────────────────────────────────────────────────────────────────

export const PRESET_DESKTOP: ViewportPreset = {
  name: "desktop",
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  deviceHints: { isMobile: false, hasTouch: false, isLandscape: true },
  sheetFormat: "A4_LANDSCAPE",
};

export const PRESET_TABLET: ViewportPreset = {
  name: "tablet",
  viewport: { width: 768, height: 1024 },
  deviceScaleFactor: 1,
  deviceHints: { isMobile: false, hasTouch: true, isLandscape: false },
  sheetFormat: "A4_PORTRAIT",
};

export const PRESET_MOBILE: ViewportPreset = {
  name: "mobile",
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  deviceHints: { isMobile: true, hasTouch: true, isLandscape: false },
  sheetFormat: "A4_PORTRAIT",
};

export const PRESETS = [PRESET_DESKTOP, PRESET_TABLET, PRESET_MOBILE] as const;

/* Map by name for direct access. */

export const PRESETS_BY_NAME: Record<PresetName, ViewportPreset> = {
  desktop: PRESET_DESKTOP,
  tablet: PRESET_TABLET,
  mobile: PRESET_MOBILE,
};
