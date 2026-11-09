import { describe, expect, it } from "vitest";
import { buildOverflowWarning, computeLayoutWidth } from "@/pixen/capture/layout-width.js";

describe("computeLayoutWidth", () => {
  it("uses innerWidth when content fits", () => {
    const m = computeLayoutWidth(1440, 1200);
    expect(m).toEqual({
      innerWidth: 1440,
      scrollWidth: 1200,
      layoutWidth: 1440,
    });
  });

  it("uses scrollWidth when content overflows", () => {
    const m = computeLayoutWidth(390, 406);
    expect(m).toEqual({
      innerWidth: 390,
      scrollWidth: 406,
      layoutWidth: 406,
    });
  });

  it("throws on non-positive innerWidth", () => {
    expect(() => computeLayoutWidth(0, 100)).toThrow(/innerWidth must be positive/);
  });

  it("throws on negative scrollWidth", () => {
    expect(() => computeLayoutWidth(1440, -1)).toThrow(/scrollWidth must be non-negative/);
  });
});

describe("buildOverflowWarning", () => {
  it("returns null when layoutWidth equals presetWidth", () => {
    const warning = buildOverflowWarning("desktop", 1440, {
      innerWidth: 1440,
      scrollWidth: 1440,
      layoutWidth: 1440,
    });
    expect(warning).toBeNull();
  });

  it("returns null when layoutWidth is smaller", () => {
    const warning = buildOverflowWarning("mobile", 390, {
      innerWidth: 390,
      scrollWidth: 380,
      layoutWidth: 390,
    });
    expect(warning).toBeNull();
  });

  it("returns a HORIZONTAL_OVERFLOW warning when layoutWidth exceeds presetWidth", () => {
    const warning = buildOverflowWarning("mobile", 390, {
      innerWidth: 390,
      scrollWidth: 406,
      layoutWidth: 406,
    });

    expect(warning).not.toBeNull();
    if (!warning) throw new Error("expected a warning");

    expect(warning.code).toBe("HORIZONTAL_OVERFLOW");
    expect(warning.data).toEqual({
      preset: "mobile",
      requestedWidth: 390,
      measuredWidth: 406,
    });
    expect(warning.message).toContain("mobile");
    expect(warning.message).toContain("390");
    expect(warning.message).toContain("406");
  });
});
