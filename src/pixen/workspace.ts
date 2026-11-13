import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export type Workspace = {
  readonly path: string;
};

/**
 * Creates a temporary workspace under the system temp directory and guarantees
 * its removal afterwards (success or error).
 */
export async function withWorkspace<T>(fn: (ws: Workspace) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), "pixen-"));
  const ws: Workspace = { path: dir };

  let result: T;
  try {
    result = await fn(ws);
  } catch (err) {
    try {
      await rm(dir, { recursive: true, force: true });
    } catch {
      // Swallow: preserve the callback error.
    }
    throw err;
  }

  await rm(dir, { recursive: true, force: true });
  return result;
}
