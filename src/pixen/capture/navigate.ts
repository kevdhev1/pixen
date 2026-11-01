import type { Page, Response } from "playwright";
import { PixenError } from "@/pixen/models/index.js";

export type NavigationResult = {
  readonly finalUrl: string;
  readonly status: number;
  readonly contentType: string | null;
};

export async function navigate(page: Page, url: URL): Promise<NavigationResult> {
  let response: Response | null;

  try {
    response = await page.goto(url.href, { waitUntil: "load" });
  } catch (cause) {
    if (cause instanceof Error && cause.name === "TimeoutError") {
      throw new PixenError("NAVIGATION_TIMEOUT", `Navigation to "${url.href}" timed out.`, {
        cause,
        context: { url: url.href },
      });
    }
    throw new PixenError("NAVIGATION_FAILED", `Failed to navigate to "${url.href}".`, {
      cause,
      context: { url: url.href },
    });
  }

  if (!response) {
    throw new PixenError("NAVIGATION_FAILED", `No response received from "${url.href}".`, {
      context: { url: url.href },
    });
  }

  const status = response.status();
  if (status >= 400) {
    throw new PixenError(
      "NAVIGATION_FAILED",
      `Navigation to "${url.href}" returned HTTP ${status}.`,
      { context: { url: url.href, status } },
    );
  }

  const contentType = response.headers()["content-type"] ?? null;
  if (!contentType?.toLowerCase().includes("text/html")) {
    throw new PixenError(
      "NAVIGATION_FAILED",
      `Navigation to "${url.href}" did not return HTML (got "${contentType ?? "none"}").`,
      { context: { url: url.href, contentType, status } },
    );
  }

  return {
    finalUrl: response.url(),
    status,
    contentType,
  };
}
