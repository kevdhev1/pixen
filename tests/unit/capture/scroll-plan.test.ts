import { describe, expect, it } from "vitest";
import { planScrollPass } from "@/pixen/capture/scroll-plan.js";

describe("planScrollPass — trivial cases", () => {
  it("returns [0] for a document shorter than the viewport", () => {
    expect(planScrollPass(500, 720)).toEqual([0]);
  });

  it("returns [0] for a document equal to the viewport", () => {
    expect(planScrollPass(720, 720)).toEqual([0]);
  });

  it("returns [0] for an empty document", () => {
    expect(planScrollPass(0, 720)).toEqual([0]);
  });
});

describe("planScrollPass — exact multiples", () => {
  it("returns two positions for a document of exactly 2 viewports", () => {
    expect(planScrollPass(1440, 720)).toEqual([0, 720]);
  });

  it("returns three positions for a document of exactly 3 viewports", () => {
    expect(planScrollPass(2160, 720)).toEqual([0, 720, 1440]);
  });
});

describe("planScrollPass — non-multiples", () => {
  it("appends maxScrollY when the loop overshoots", () => {
    // 5000 with viewport 720: loop yields [0..3600], max is 4280
    expect(planScrollPass(5000, 720)).toEqual([0, 720, 1440, 2160, 2880, 3600, 4280]);
  });

  it("appends maxScrollY when the last step would be tiny", () => {
    // 730 with viewport 720: loop yields [0], max is 10
    expect(planScrollPass(730, 720)).toEqual([0, 10]);
  });

  it("does not append a duplicate when the last step equals maxScrollY", () => {
    // 800 with viewport 400: loop yields [0, 400], max is 400
    expect(planScrollPass(800, 400)).toEqual([0, 400]);
  });
});

describe("planScrollPass — ordering and invariants", () => {
  it("positions are strictly increasing", () => {
    const positions = planScrollPass(5000, 720);

    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];

      if (prev === undefined || curr === undefined) {
        throw new Error(`unexpected undefined at index ${i}`);
      }

      expect(curr).toBeGreaterThan(prev);
    }
  });

  it("starts at 0", () => {
    expect(planScrollPass(5000, 720)[0]).toBe(0);
  });

  it("ends at documentHeight - viewportHeight", () => {
    const positions = planScrollPass(5000, 720);
    const last = positions[positions.length - 1];

    if (last === undefined) {
      throw new Error("expected at least one position");
    }

    expect(last).toBe(5000 - 720);
  });

  it("no position exceeds maxScrollY", () => {
    const positions = planScrollPass(5000, 720);
    const max = 5000 - 720;
    for (const p of positions) {
      expect(p).toBeLessThanOrEqual(max);
    }
  });
});

describe("planScrollPass — input validation", () => {
  it("throws on zero viewport", () => {
    expect(() => planScrollPass(5000, 0)).toThrow(/viewportHeight must be positive/);
  });

  it("throws on negative viewport", () => {
    expect(() => planScrollPass(5000, -100)).toThrow(/viewportHeight must be positive/);
  });

  it("throws on negative document height", () => {
    expect(() => planScrollPass(-1, 720)).toThrow(/documentHeight must be non-negative/);
  });
});
