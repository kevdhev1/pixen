import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const FIXTURES_DIR = path.join(import.meta.dirname, "../fixtures");

/* A 1x1 transparent PNG, embedded as base64 */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

export type FixturesServerOptions = {
  /* Delay in milliseconds applied to /slow responses */
  readonly slowDelayMs?: number;
};

export type FixturesServer = {
  readonly port: number;
  readonly baseUrl: string;
  readonly close: () => Promise<void>;
};

/**
 * Starts a minimal HTTP server that serves test fixtures from `tests/fixtures/`.
 *
 * Routes:
 *   GET /            → simple.html
 *   GET /simple      → simple.html
 *   GET /slow        → slow.html, delayed by `slowDelayMs`
 *   GET /redirect    → 302 redirect to /simple
 *   GET /lazy        → lazy.html
 *   GET /img/tiny.png → 1x1 transparent PNG
 *   *                → 404
 */

export async function startFixturesServer(
  options: FixturesServerOptions = {},
): Promise<FixturesServer> {
  const slowDelayMs = options.slowDelayMs ?? 2000;

  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;

    try {
      switch (pathname) {
        case "/":
        case "/simple": {
          const html = await readFile(path.join(FIXTURES_DIR, "simple.html"));
          res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          res.end(html);
          return;
        }

        case "/slow": {
          await new Promise((resolve) => setTimeout(resolve, slowDelayMs));
          const html = await readFile(path.join(FIXTURES_DIR, "slow.html"));
          res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          res.end(html);
          return;
        }

        case "/redirect": {
          res.writeHead(302, { location: "/simple" });
          res.end();
          return;
        }

        case "/lazy": {
          const html = await readFile(path.join(FIXTURES_DIR, "lazy.html"));
          res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          res.end(html);
          return;
        }

        case "/img/tiny.png": {
          res.writeHead(200, { "content-type": "image/png" });
          res.end(TINY_PNG);
          return;
        }

        default: {
          res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
          res.end("Not found");
        }
      }
    } catch {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end("Internal server error");
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to obtain server address");
  }

  return {
    port: address.port,
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
