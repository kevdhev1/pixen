import { describe, expect, it } from "vitest";
import { PRESET_DESKTOP, PRESET_MOBILE, PRESET_TABLET, PRESETS } from "@/pixen/models/index.js";

describe("ViewportPreset — canonical values", () => {
  it("Desktop has the expected values.", () => {
    expect(PRESET_DESKTOP).toEqual({
      name: "desktop",
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      deviceHints: { isMobile: false, hasTouch: false, isLandscape: true },
      sheetFormat: "A4_LANDSCAPE",
    });
  });

  it("Tablet has the expected values.", () => {
    expect(PRESET_TABLET).toEqual({
      name: "tablet",
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 2,
      deviceHints: { isMobile: false, hasTouch: true, isLandscape: false },
      sheetFormat: "A4_PORTRAIT",
    });
  });

  it("Mobile has the expected values.", () => {
    expect(PRESET_MOBILE).toEqual({
      name: "mobile",
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      deviceHints: { isMobile: true, hasTouch: true, isLandscape: false },
      sheetFormat: "A4_PORTRAIT",
    });
  });

  it("PRESETS contains exactly the three presets in order", () => {
    expect(PRESETS).toHaveLength(3);
    expect(PRESETS[0]).toBe(PRESET_DESKTOP);
    expect(PRESETS[1]).toBe(PRESET_TABLET);
    expect(PRESETS[2]).toBe(PRESET_MOBILE);
  });

  it("Device scale factors are integers", () => {
    for (const preset of PRESETS) {
      expect(Number.isInteger(preset.deviceScaleFactor)).toBe(true);
    }
  });
});
