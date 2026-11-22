import { describe, expect, it } from "vitest";
import { PRESET_DESKTOP, PRESET_MOBILE, PRESET_TABLET } from "@/pixen/models/index.js";
import { planCaptureBlocks } from "@/pixen/pdf/capture-blocks.js";

describe("planCaptureBlocks — block height per preset", () => {
  it("desktop: 1018 CSS px per block (1 chunk)", () => {
    const plan = planCaptureBlocks(5000, PRESET_DESKTOP);
    expect(plan.blocks[0]?.heightCssPx).toBe(1018);
    expect(plan.blocks[0]?.fragments).toHaveLength(1);
    expect(plan.blocks[0]?.fragments[0]?.heightDevicePx).toBe(1018);
  });

  it("tablet: 1086 CSS px per block (1 chunk)", () => {
    const plan = planCaptureBlocks(5000, PRESET_TABLET);
    expect(plan.blocks[0]?.heightCssPx).toBe(1086);
    expect(plan.blocks[0]?.fragments).toHaveLength(1);
    expect(plan.blocks[0]?.fragments[0]?.heightDevicePx).toBe(2172);
  });

  it("mobile: 1103 CSS px per block (2 chunks of 1103 device px)", () => {
    const plan = planCaptureBlocks(5000, PRESET_MOBILE);
    expect(plan.blocks[0]?.heightCssPx).toBe(1103);
    expect(plan.blocks[0]?.fragments).toHaveLength(2);
    expect(plan.blocks[0]?.fragments[0]?.heightDevicePx).toBe(1103);
    expect(plan.blocks[0]?.fragments[1]?.heightDevicePx).toBe(1103);
  });
});

describe("planCaptureBlocks — exact multiple of block", () => {
  it("mobile: 2 blocks, no partial, no omission", () => {
    const plan = planCaptureBlocks(2206, PRESET_MOBILE);
    expect(plan.blocks).toHaveLength(2);
    expect(plan.omittedDevicePx).toBe(0);
    for (const b of plan.blocks) {
      expect(b.fragments).toHaveLength(2);
    }
  });

  it("desktop: 3 blocks, no partial", () => {
    const plan = planCaptureBlocks(3054, PRESET_DESKTOP);
    expect(plan.blocks).toHaveLength(3);
    expect(plan.omittedDevicePx).toBe(0);
  });
});

describe("planCaptureBlocks — mobile remainders", () => {
  // H = 1 block (1103) + remainder
  const cases: ReadonlyArray<{
    remainderCss: number;
    expectedFragmentsInPartial: number;
    expectedOmittedDevicePx: number;
  }> = [
    { remainderCss: 1, expectedFragmentsInPartial: 0, expectedOmittedDevicePx: 2 },
    { remainderCss: 15, expectedFragmentsInPartial: 0, expectedOmittedDevicePx: 30 },
    { remainderCss: 31, expectedFragmentsInPartial: 0, expectedOmittedDevicePx: 62 },
    { remainderCss: 32, expectedFragmentsInPartial: 1, expectedOmittedDevicePx: 0 },
    { remainderCss: 33, expectedFragmentsInPartial: 1, expectedOmittedDevicePx: 0 },
    { remainderCss: 551, expectedFragmentsInPartial: 1, expectedOmittedDevicePx: 0 },
    { remainderCss: 552, expectedFragmentsInPartial: 1, expectedOmittedDevicePx: 1 },
    { remainderCss: 553, expectedFragmentsInPartial: 1, expectedOmittedDevicePx: 3 },
    { remainderCss: 1102, expectedFragmentsInPartial: 2, expectedOmittedDevicePx: 0 },
  ];

  for (const c of cases) {
    it(`remainder ${c.remainderCss} CSS px → ${c.expectedFragmentsInPartial} fragment(s) in partial, ${c.expectedOmittedDevicePx} device px omitted`, () => {
      const H = 1103 + c.remainderCss;
      const plan = planCaptureBlocks(H, PRESET_MOBILE);

      // Full block (2 fragments) + partial block
      const fullBlocks = plan.blocks.filter((b) => b.heightCssPx === 1103);
      expect(fullBlocks).toHaveLength(1);

      const partial = plan.blocks.find((b) => b.heightCssPx !== 1103);
      if (c.expectedFragmentsInPartial === 0) {
        expect(partial).toBeUndefined();
      } else {
        expect(partial).toBeDefined();
        expect(partial?.fragments).toHaveLength(c.expectedFragmentsInPartial);
        expect(partial?.heightCssPx).toBe(c.remainderCss);
      }

      expect(plan.omittedDevicePx).toBe(c.expectedOmittedDevicePx);
    });
  }
});

describe("planCaptureBlocks — page smaller than one block", () => {
  it("desktop: page of 500 CSS px → single partial block with one fragment", () => {
    const plan = planCaptureBlocks(500, PRESET_DESKTOP);
    expect(plan.blocks).toHaveLength(1);
    const b = plan.blocks[0];
    if (!b) throw new Error("expected one block");
    expect(b.yCssPx).toBe(0);
    expect(b.heightCssPx).toBe(500);
    expect(b.fragments).toHaveLength(1);
    expect(b.fragments[0]?.heightDevicePx).toBe(500);
    expect(plan.omittedDevicePx).toBe(0);
  });

  it("mobile: page of 40 CSS px → one fragment of 80 device px", () => {
    const plan = planCaptureBlocks(40, PRESET_MOBILE);
    expect(plan.blocks).toHaveLength(1);
    expect(plan.blocks[0]?.fragments).toHaveLength(1);
    expect(plan.blocks[0]?.fragments[0]?.heightDevicePx).toBe(80);
    expect(plan.omittedDevicePx).toBe(0);
  });
});

describe("planCaptureBlocks — below 32 CSS px threshold", () => {
  it("mobile: 1 CSS px throws", () => {
    expect(() => planCaptureBlocks(1, PRESET_MOBILE)).toThrow(/below the omission threshold/);
  });

  it("mobile: 15 CSS px throws", () => {
    expect(() => planCaptureBlocks(15, PRESET_MOBILE)).toThrow(/below the omission threshold/);
  });

  it("mobile: 31 CSS px throws", () => {
    expect(() => planCaptureBlocks(31, PRESET_MOBILE)).toThrow(/below the omission threshold/);
  });

  it("desktop: 31 CSS px throws", () => {
    expect(() => planCaptureBlocks(31, PRESET_DESKTOP)).toThrow(/below the omission threshold/);
  });

  it("mobile: 32 CSS px does not throw", () => {
    expect(() => planCaptureBlocks(32, PRESET_MOBILE)).not.toThrow();
  });

  it("desktop: 32 CSS px does not throw", () => {
    expect(() => planCaptureBlocks(32, PRESET_DESKTOP)).not.toThrow();
  });
});

describe("planCaptureBlocks — invariants", () => {
  const cases: ReadonlyArray<{ name: string; H: number; preset: typeof PRESET_MOBILE }> = [
    { name: "mobile/short", H: 500, preset: PRESET_MOBILE },
    { name: "mobile/medium", H: 5000, preset: PRESET_MOBILE },
    { name: "mobile/huge", H: 100_000, preset: PRESET_MOBILE },
    { name: "desktop/medium", H: 10_000, preset: PRESET_DESKTOP as typeof PRESET_MOBILE },
    { name: "tablet/medium", H: 8_000, preset: PRESET_TABLET as typeof PRESET_MOBILE },
  ];

  for (const { name, H, preset } of cases) {
    describe(name, () => {
      const plan = planCaptureBlocks(H, preset);
      const totalDevice = H * preset.deviceScaleFactor;

      it("fragments within each block are contiguous", () => {
        for (const b of plan.blocks) {
          for (let i = 1; i < b.fragments.length; i++) {
            const prev = b.fragments[i - 1];
            const curr = b.fragments[i];
            if (!prev || !curr) throw new Error(`missing fragment at ${i}`);
            expect(curr.yDevicePx).toBe(prev.yDevicePx + prev.heightDevicePx);
          }
        }
      });

      it("blocks are contiguous in CSS space when no omission occurred", () => {
        if (plan.omittedDevicePx === 0) {
          for (let i = 1; i < plan.blocks.length; i++) {
            const prev = plan.blocks[i - 1];
            const curr = plan.blocks[i];
            if (!prev || !curr) throw new Error(`missing block at ${i}`);
            expect(curr.yCssPx).toBe(prev.yCssPx + prev.heightCssPx);
          }
        }
      });

      it("conserved fragments + omitted equals total page device px", () => {
        const conserved = plan.blocks.reduce(
          (sum, b) => sum + b.fragments.reduce((s, f) => s + f.heightDevicePx, 0),
          0,
        );
        expect(conserved + plan.omittedDevicePx).toBe(totalDevice);
      });

      it("every fragment has positive height", () => {
        for (const b of plan.blocks) {
          for (const f of b.fragments) {
            expect(f.heightDevicePx).toBeGreaterThan(0);
          }
        }
      });

      it("is deterministic", () => {
        expect(planCaptureBlocks(H, preset)).toEqual(plan);
      });
    });
  }
});

describe("planCaptureBlocks — input validation", () => {
  it("throws on zero page height", () => {
    expect(() => planCaptureBlocks(0, PRESET_MOBILE)).toThrow(/pageHeightCss must be a positive/);
  });

  it("throws on negative page height", () => {
    expect(() => planCaptureBlocks(-1, PRESET_MOBILE)).toThrow(/pageHeightCss must be a positive/);
  });

  it("throws on non-integer page height", () => {
    expect(() => planCaptureBlocks(1000.5, PRESET_MOBILE)).toThrow(
      /pageHeightCss must be an integer/,
    );
  });

  it("throws on NaN and Infinity", () => {
    expect(() => planCaptureBlocks(NaN, PRESET_MOBILE)).toThrow(/pageHeightCss must be a positive/);
    expect(() => planCaptureBlocks(Infinity, PRESET_MOBILE)).toThrow(
      /pageHeightCss must be a positive/,
    );
  });
});
