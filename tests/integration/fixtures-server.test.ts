import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type FixturesServer, startFixturesServer } from "../helpers/fixtures-server.js";

let server: FixturesServer;

beforeAll(async () => {
  server = await startFixturesServer({ slowDelayMs: 100 });
});

afterAll(async () => {
  await server.close();
});

describe("fixtures server — routing", () => {
  it("serves /simple with HTML", async () => {
    const res = await fetch(`${server.baseUrl}/simple`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("<h1>Simple page</h1>");
  });

  it("serves / with the simple page", async () => {
    const res = await fetch(`${server.baseUrl}/`);
    expect(res.status).toBe(200);
  });

  it("returns 404 for unknown paths", async () => {
    const res = await fetch(`${server.baseUrl}/does-not-exist`);
    expect(res.status).toBe(404);
  });

  it("redirects /redirect to /simple", async () => {
    const res = await fetch(`${server.baseUrl}/redirect`, { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/simple");
  });

  it("serves lazy.html with lazy-loading images", async () => {
    const res = await fetch(`${server.baseUrl}/lazy`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('loading="lazy"');
    expect(html.match(/loading="lazy"/g)?.length).toBe(3);
  });

  it("serves tiny PNG images", async () => {
    const res = await fetch(`${server.baseUrl}/img/tiny.png`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
  });
});

describe("fixtures server — slow endpoint", () => {
  it("delays the response by at least the configured amount", async () => {
    const start = Date.now();
    const res = await fetch(`${server.baseUrl}/slow`);
    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    expect(elapsed).toBeGreaterThanOrEqual(90);
  });
});

describe("fixtures server — lifecycle", () => {
  it("assigns a different port on each start", async () => {
    const other = await startFixturesServer();
    try {
      expect(other.port).not.toBe(server.port);
    } finally {
      await other.close();
    }
  });

  it("stops serving after close", async () => {
    const other = await startFixturesServer();
    await other.close();

    await expect(fetch(`${other.baseUrl}/simple`)).rejects.toThrow();
  });
});
