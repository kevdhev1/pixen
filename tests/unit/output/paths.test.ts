import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getPdfPath,
  getSectionFileName,
  getSectionPath,
  getSectionsDir,
} from "@/pixen/output/index.js";

describe("getPdfPath", () => {
  it("builds the path to a preset PDF", () => {
    const result = getPdfPath("/tmp/ref", "desktop");
    expect(result).toBe(path.join("/tmp/ref", "pdf", "desktop.pdf"));
  });

  it("presetName in lowercase (comes from the presets vocabulary)", () => {
    expect(getPdfPath("/tmp/ref", "mobile")).toContain("mobile.pdf");
  });
});

describe("getSectionsDir", () => {
  it("build the sections folder for a preset", () => {
    const result = getSectionsDir("/tmp/ref", "tablet");
    expect(result).toBe(path.join("/tmp/ref", "sections", "tablet"));
  });
});

describe("getSectionFileName — format", () => {
  it("index 1 → '001'", () => {
    expect(getSectionFileName({ index: 1, label: "hero", extension: "webp" })).toBe(
      "001-hero.webp",
    );
  });

  it("index 42 → '042' (zero-padded)", () => {
    expect(getSectionFileName({ index: 42, label: "footer", extension: "webp" })).toBe(
      "042-footer.webp",
    );
  });

  it("index 999 → '999' (not truncated)", () => {
    expect(getSectionFileName({ index: 999, label: "pricing", extension: "webp" })).toBe(
      "999-pricing.webp",
    );
  });

  it("index 1000 → '1000' (doesn't break the format; it simply grows)", () => {
    expect(getSectionFileName({ index: 1000, label: "hero", extension: "webp" })).toBe(
      "1000-hero.webp",
    );
  });

  it("without part → without suffix", () => {
    expect(getSectionFileName({ index: 3, label: "cta", extension: "png" })).toBe("003-cta.png");
  });

  it("with part → suffix '-part-N'", () => {
    expect(getSectionFileName({ index: 3, label: "pricing", extension: "webp", part: 2 })).toBe(
      "003-pricing-part-2.webp",
    );
  });

  it("part 10 → 'part-10' (without zero-padding)", () => {
    expect(getSectionFileName({ index: 5, label: "gallery", extension: "webp", part: 10 })).toBe(
      "005-gallery-part-10.webp",
    );
  });

  it("supports jpg/jpeg/png/webp extensions", () => {
    expect(getSectionFileName({ index: 1, label: "hero", extension: "jpg" })).toMatch(/\.jpg$/);
    expect(getSectionFileName({ index: 1, label: "hero", extension: "jpeg" })).toMatch(/\.jpeg$/);
    expect(getSectionFileName({ index: 1, label: "hero", extension: "png" })).toMatch(/\.png$/);
    expect(getSectionFileName({ index: 1, label: "hero", extension: "webp" })).toMatch(/\.webp$/);
  });

  it("never contains spaces, uppercase letters, or accents", () => {
    const name = getSectionFileName({ index: 7, label: "testimonials", extension: "webp" });
    expect(name).toMatch(/^[a-z0-9.-]+$/);
  });
});

describe("getSectionFileName — validation", () => {
  it("reject index 0", () => {
    expect(() => getSectionFileName({ index: 0, label: "hero", extension: "webp" })).toThrow(
      /Invalid section index/,
    );
  });

  it("rejects negative index", () => {
    expect(() => getSectionFileName({ index: -1, label: "hero", extension: "webp" })).toThrow(
      /Invalid section index/,
    );
  });

  it("rejects non-integer index", () => {
    expect(() => getSectionFileName({ index: 1.5, label: "hero", extension: "webp" })).toThrow(
      /Invalid section index/,
    );
  });

  it("reject part 1 (an undivided section doesn't need a part)", () => {
    expect(() =>
      getSectionFileName({ index: 1, label: "hero", extension: "webp", part: 1 }),
    ).toThrow(/Invalid part number/);
  });

  it("rejects part 0 or negative", () => {
    expect(() =>
      getSectionFileName({ index: 1, label: "hero", extension: "webp", part: 0 }),
    ).toThrow(/Invalid part number/);
  });
});

describe("getSectionPath — composition", () => {
  it("join getSectionsDir + getSectionFileName", () => {
    const result = getSectionPath("/tmp/ref", "desktop", {
      index: 1,
      label: "hero",
      extension: "webp",
    });
    expect(result).toBe(path.join("/tmp/ref", "sections", "desktop", "001-hero.webp"));
  });
});
