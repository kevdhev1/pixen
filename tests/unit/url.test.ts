import { describe, expect, it } from "vitest";
import { PixenError } from "@/pixen/models/errors.js";
import { normalizeUrl } from "@/pixen/url.js";

describe("normalizeUrl — valid cases", () => {
  it.each([
    // input → normalized href
    ["https://example.com", "https://example.com/"],
    ["http://example.com", "http://example.com/"],
    ["example.com", "https://example.com/"],
    ["www.example.com/path", "https://www.example.com/path"],
    ["https://Example.COM", "https://example.com/"],
    ["https://example.com:443", "https://example.com/"],
    ["http://localhost:3000", "http://localhost:3000/"],
    ["localhost", "https://localhost/"],
    ["https://example.com/a?b=c#d", "https://example.com/a?b=c#d"],
  ])("normalize %s → %s", (input, expected) => {
    expect(normalizeUrl(input).href).toBe(expected);
  });
});

describe("normalizeUrl — invalid cases", () => {
  it.each([
    ["", "The URL is empty"],
    ["   ", "The URL is empty"],
    ["file:///etc/passwd", "Unsupported scheme"],
    ["javascript:alert(1)", "Unsupported scheme"],
    ["chrome://settings", "Unsupported scheme"],
    ["data:text/plain,hola", "Unsupported scheme"],
    ["ftp://example.com", "Unsupported scheme"],
    ["mailto:foo@bar.com", "Unsupported scheme"],
  ])("rejects %s with a message containing %s", (input, messageFragment) => {
    expect(() => normalizeUrl(input)).toThrow(PixenError);
    expect(() => normalizeUrl(input)).toThrow(messageFragment);
  });
});

describe("normalizeUrl — localhost:3000 trap", () => {
  it("rejects localhost:3000 with a specific message", () => {
    expect(() => normalizeUrl("localhost:3000")).toThrow(PixenError);

    try {
      normalizeUrl("localhost:3000");
      expect.unreachable("it should have thrown an error");
    } catch (err) {
      expect(PixenError.isPixenError(err)).toBe(true);
      if (PixenError.isPixenError(err)) {
        expect(err.code).toBe("INVALID_URL");
        expect(err.message).toContain("http://localhost:3000");
      }
    }
  });

  it("reject example.com:8080 with a specific message", () => {
    try {
      normalizeUrl("example.com:8080");
      expect.unreachable("it should have thrown an error");
    } catch (err) {
      if (PixenError.isPixenError(err)) {
        expect(err.message).toContain("http://example.com:8080");
      }
    }
  });
});

describe("normalizeUrl — error contract", () => {
  it("always throws PixenError with code INVALID_URL", () => {
    const invalidInputs = ["", "file:///x", "localhost:3000", "not a url at all"];

    for (const input of invalidInputs) {
      try {
        normalizeUrl(input);
        expect.unreachable(`"${input}" should have thrown an error`);
      } catch (err) {
        expect(PixenError.isPixenError(err)).toBe(true);
        if (PixenError.isPixenError(err)) {
          expect(err.code).toBe("INVALID_URL");
        }
      }
    }
  });
});
