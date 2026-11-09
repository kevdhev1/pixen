import { describe, expect, it } from "vitest";
import { presetToContextOptions } from "@/pixen/capture/viewport.js";
import { PRESET_DESKTOP, PRESET_MOBILE, PRESET_TABLET } from "@/pixen/models/index.js";

describe("presetToContextOptions — desktop", () => {
  it("uses 1440×900 with DPR 1 and no device overrides", () => {
    const opts = presetToContextOptions(PRESET_DESKTOP);

    expect(opts.viewport).toEqual({ width: 1440, height: 900 });
    expect(opts.screen).toEqual({ width: 1440, height: 900 });
    expect(opts.deviceScaleFactor).toBe(1);
    expect(opts.userAgent).toBeUndefined();
    expect(opts.isMobile).toBeUndefined();
    expect(opts.hasTouch).toBeUndefined();
  });
});

describe("presetToContextOptions — tablet", () => {
  it("uses 768×1024 with DPR 2 and the Galaxy Tab S9 descriptor", () => {
    const opts = presetToContextOptions(PRESET_TABLET);

    expect(opts.viewport).toEqual({ width: 768, height: 1024 });
    expect(opts.screen).toEqual({ width: 768, height: 1024 });
    expect(opts.deviceScaleFactor).toBe(2);
    expect(opts.userAgent).toEqual(expect.any(String));
    expect(opts.userAgent).not.toBe("");
    expect(opts.isMobile).toBe(true);
    expect(opts.hasTouch).toBe(true);
  });
});

describe("presetToContextOptions — mobile", () => {
  it("uses 390×844 with DPR 2 and the Pixel 7 descriptor", () => {
    const opts = presetToContextOptions(PRESET_MOBILE);

    expect(opts.viewport).toEqual({ width: 390, height: 844 });
    expect(opts.screen).toEqual({ width: 390, height: 844 });
    expect(opts.deviceScaleFactor).toBe(2);
    expect(opts.userAgent).toEqual(expect.any(String));
    expect(opts.userAgent).not.toBe("");
    expect(opts.isMobile).toBe(true);
    expect(opts.hasTouch).toBe(true);
  });
});
