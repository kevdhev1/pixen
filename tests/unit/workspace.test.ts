import { stat } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { withWorkspace } from "@/pixen/workspace.js";

describe("withWorkspace", () => {
  it("creates a directory that exists during the callback", async () => {
    let existed = false;
    await withWorkspace(async (ws) => {
      const s = await stat(ws.path);
      existed = s.isDirectory();
    });
    expect(existed).toBe(true);
  });

  it("cleans up the directory after success", async () => {
    let captured = "";
    await withWorkspace(async (ws) => {
      captured = ws.path;
    });
    await expect(stat(captured)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("cleans up the directory after error", async () => {
    let captured = "";
    await expect(
      withWorkspace(async (ws) => {
        captured = ws.path;
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    await expect(stat(captured)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("returns a unique directory per call", async () => {
    const paths = await Promise.all([
      withWorkspace(async (ws) => ws.path),
      withWorkspace(async (ws) => ws.path),
    ]);
    expect(paths[0]).not.toBe(paths[1]);
  });
});
