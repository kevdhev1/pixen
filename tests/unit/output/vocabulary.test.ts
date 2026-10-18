import { describe, expect, it } from "vitest";
import { isSectionLabel, SECTION_LABELS } from "@/pixen/output/index.js";

describe("SECTION_LABELS — closed vocabulary", () => {
  it("all tags are lowercase", () => {
    for (const label of SECTION_LABELS) {
      expect(label).toBe(label.toLowerCase());
    }
  });

  it("no label contains spaces, hyphens, or special characters", () => {
    for (const label of SECTION_LABELS) {
      expect(label).toMatch(/^[a-z]+$/);
    }
  });

  it("there are no duplicate tags", () => {
    const unique = new Set(SECTION_LABELS);
    expect(unique.size).toBe(SECTION_LABELS.length);
  });

  it("includes the 'unknown' fallback", () => {
    expect(SECTION_LABELS).toContain("unknown");
  });
});

describe("isSectionLabel — type guard", () => {
  it("accepts valid tags", () => {
    expect(isSectionLabel("hero")).toBe(true);
    expect(isSectionLabel("footer")).toBe(true);
    expect(isSectionLabel("unknown")).toBe(true);
  });

  it("rejects strings outside the vocabulary", () => {
    expect(isSectionLabel("HERO")).toBe(false);
    expect(isSectionLabel("hero-section")).toBe(false);
    expect(isSectionLabel("heroSection")).toBe(false);
    expect(isSectionLabel("")).toBe(false);
    expect(isSectionLabel("patata")).toBe(false);
  });
});
