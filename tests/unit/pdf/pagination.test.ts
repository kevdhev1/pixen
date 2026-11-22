import { describe, expect, it } from "vitest";
import { planChunks } from "@/pixen/pdf/pagination.js";

const MOBILE = { deviceScaleFactor: 2, chunkWidthCss: 390, aspectRatio: 210 / 297 } as const;
const DESKTOP = { deviceScaleFactor: 1, chunkWidthCss: 1440, aspectRatio: 297 / 210 } as const;
const TABLET = { deviceScaleFactor: 2, chunkWidthCss: 768, aspectRatio: 210 / 297 } as const;

describe("planChunks — chunk sizing", () => {
  it("computes 1103 device px per chunk for mobile (390 CSS, DPR 2, A4 portrait)", () => {
    const chunks = planChunks({ ...MOBILE, pageHeightCss: 2000 });
    expect(chunks[0]?.heightDevicePx).toBe(1103);
    expect(chunks[0]?.heightCssPx).toBe(551.5);
  });

  it("computes 1018 device px per chunk for desktop (1440 CSS, DPR 1, A4 landscape)", () => {
    const chunks = planChunks({ ...DESKTOP, pageHeightCss: 5000 });
    expect(chunks[0]?.heightDevicePx).toBe(1018);
    expect(chunks[0]?.heightCssPx).toBe(1018);
  });

  it("computes 2172 device px per chunk for tablet (768 CSS, DPR 2, A4 portrait)", () => {
    const chunks = planChunks({ ...TABLET, pageHeightCss: 5000 });
    expect(chunks[0]?.heightDevicePx).toBe(2172);
    expect(chunks[0]?.heightCssPx).toBe(1086);
  });
});

describe("planChunks — page smaller than one chunk", () => {
  it("returns a single chunk covering the whole page", () => {
    const chunks = planChunks({ ...MOBILE, pageHeightCss: 500 });
    expect(chunks).toHaveLength(1);
    const first = chunks[0];
    if (!first) throw new Error("expected one chunk");
    expect(first.index).toBe(0);
    expect(first.yDevicePx).toBe(0);
    expect(first.heightDevicePx).toBe(1000);
    expect(first.isLast).toBe(true);
  });

  it("returns a single chunk when page height equals chunk height exactly", () => {
    const chunks = planChunks({ ...MOBILE, pageHeightCss: 551.5 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.heightDevicePx).toBe(1103);
    expect(chunks[0]?.isLast).toBe(true);
  });
});

describe("planChunks — exact multiple", () => {
  it("returns N chunks of equal height when page is an exact multiple", () => {
    const chunks = planChunks({ ...MOBILE, pageHeightCss: 1103 });
    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.heightDevicePx).toBe(1103);
    expect(chunks[1]?.heightDevicePx).toBe(1103);
    expect(chunks[0]?.isLast).toBe(false);
    expect(chunks[1]?.isLast).toBe(true);
  });

  it("returns 3 chunks for a page of 3 × chunk height", () => {
    const chunks = planChunks({ ...MOBILE, pageHeightCss: 1654.5 });
    expect(chunks).toHaveLength(3);
    expect(chunks[2]?.isLast).toBe(true);
    expect(chunks[2]?.heightDevicePx).toBe(1103);
  });
});

describe("planChunks — remainder", () => {
  it("appends a smaller last chunk for the remainder", () => {
    const chunks = planChunks({ ...MOBILE, pageHeightCss: 1153 });
    expect(chunks).toHaveLength(3);
    expect(chunks[0]?.heightDevicePx).toBe(1103);
    expect(chunks[1]?.heightDevicePx).toBe(1103);
    expect(chunks[2]?.heightDevicePx).toBe(100);
    expect(chunks[2]?.heightCssPx).toBe(50);
    expect(chunks[2]?.isLast).toBe(true);
  });

  it("handles a 1-px remainder as its own last chunk", () => {
    const chunks = planChunks({ ...MOBILE, pageHeightCss: 1103.5 });
    expect(chunks).toHaveLength(3);
    expect(chunks[2]?.heightDevicePx).toBe(1);
    expect(chunks[2]?.heightCssPx).toBe(0.5);
    expect(chunks[2]?.isLast).toBe(true);
  });
});

describe("planChunks — invariants", () => {
  const cases: ReadonlyArray<{ name: string; input: Parameters<typeof planChunks>[0] }> = [
    { name: "mobile/short", input: { ...MOBILE, pageHeightCss: 500 } },
    { name: "mobile/medium", input: { ...MOBILE, pageHeightCss: 2000 } },
    { name: "mobile/huge", input: { ...MOBILE, pageHeightCss: 100_000 } },
    { name: "desktop/long", input: { ...DESKTOP, pageHeightCss: 10_000 } },
    { name: "tablet/long", input: { ...TABLET, pageHeightCss: 8_000 } },
  ];

  for (const { name, input } of cases) {
    describe(name, () => {
      const chunks = planChunks(input);
      const expectedTotalDevice = Math.round(input.pageHeightCss * input.deviceScaleFactor);

      it("is contiguous with no gaps or overlaps", () => {
        for (let i = 1; i < chunks.length; i++) {
          const prev = chunks[i - 1];
          const curr = chunks[i];
          if (!prev || !curr) throw new Error(`missing chunk at ${i}`);
          expect(curr.yDevicePx).toBe(prev.yDevicePx + prev.heightDevicePx);
        }
      });

      it("sums to the full device page height", () => {
        const total = chunks.reduce((acc, ch) => acc + ch.heightDevicePx, 0);
        expect(total).toBe(expectedTotalDevice);
      });

      it("starts at 0 and ends at the page bottom", () => {
        const first = chunks[0];
        const last = chunks[chunks.length - 1];
        if (!first || !last) throw new Error("expected at least one chunk");
        expect(first.yDevicePx).toBe(0);
        expect(last.yDevicePx + last.heightDevicePx).toBe(expectedTotalDevice);
      });

      it("flags only the last chunk", () => {
        chunks.forEach((ch, i) => {
          expect(ch.isLast).toBe(i === chunks.length - 1);
        });
      });

      it("yields identical output on a second call (deterministic)", () => {
        expect(planChunks(input)).toEqual(chunks);
      });

      it("every chunk has positive height", () => {
        for (const ch of chunks) {
          expect(ch.heightDevicePx).toBeGreaterThan(0);
        }
      });

      it("css and device coordinates are consistent", () => {
        for (const ch of chunks) {
          expect(ch.yCssPx * input.deviceScaleFactor).toBeCloseTo(ch.yDevicePx, 5);
          expect(ch.heightCssPx * input.deviceScaleFactor).toBeCloseTo(ch.heightDevicePx, 5);
        }
      });
    });
  }
});

describe("planChunks — huge heights", () => {
  it("handles 100_000 CSS px without overflow or drift", () => {
    const chunks = planChunks({ ...MOBILE, pageHeightCss: 100_000 });
    const expectedTotalDevice = 200_000;
    const total = chunks.reduce((acc, ch) => acc + ch.heightDevicePx, 0);
    expect(total).toBe(expectedTotalDevice);
    expect(chunks.length).toBe(182);
    const last = chunks[chunks.length - 1];
    if (!last) throw new Error("expected a last chunk");
    expect(last.isLast).toBe(true);
    expect(last.heightDevicePx).toBe(200_000 - 181 * 1103);
    expect(last.heightDevicePx).toBe(357);
  });
});

describe("planChunks — input validation", () => {
  it("throws on zero page height", () => {
    expect(() => planChunks({ ...MOBILE, pageHeightCss: 0 })).toThrow(
      /pageHeightCss must be a positive/,
    );
  });

  it("throws on negative page height", () => {
    expect(() => planChunks({ ...MOBILE, pageHeightCss: -1 })).toThrow(
      /pageHeightCss must be a positive/,
    );
  });

  it("throws on non-finite page height", () => {
    expect(() => planChunks({ ...MOBILE, pageHeightCss: NaN })).toThrow(
      /pageHeightCss must be a positive/,
    );
    expect(() => planChunks({ ...MOBILE, pageHeightCss: Infinity })).toThrow(
      /pageHeightCss must be a positive/,
    );
  });

  it("throws on zero or negative DPR", () => {
    expect(() => planChunks({ ...MOBILE, pageHeightCss: 1000, deviceScaleFactor: 0 })).toThrow(
      /deviceScaleFactor must be a positive/,
    );
    expect(() => planChunks({ ...MOBILE, pageHeightCss: 1000, deviceScaleFactor: -1 })).toThrow(
      /deviceScaleFactor must be a positive/,
    );
  });

  it("throws on zero or negative chunk width", () => {
    expect(() => planChunks({ ...MOBILE, pageHeightCss: 1000, chunkWidthCss: 0 })).toThrow(
      /chunkWidthCss must be a positive/,
    );
  });

  it("throws on zero or negative aspect ratio", () => {
    expect(() => planChunks({ ...MOBILE, pageHeightCss: 1000, aspectRatio: 0 })).toThrow(
      /aspectRatio must be a positive/,
    );
    expect(() => planChunks({ ...MOBILE, pageHeightCss: 1000, aspectRatio: -1 })).toThrow(
      /aspectRatio must be a positive/,
    );
  });

  it("throws when sub-pixel page height rounds down to 0 device px", () => {
    expect(() =>
      planChunks({
        pageHeightCss: 0.3,
        deviceScaleFactor: 1,
        chunkWidthCss: 390,
        aspectRatio: 210 / 297,
      }),
    ).toThrow(/resolves to 0 device px/);
  });
});
