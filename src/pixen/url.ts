import { PixenError } from "@/pixen/models/errors.js";

/* Regex that detects whether a string starts with a scheme (RFC 3986) */

const SCHEME_RE = /^([a-zA-Z][a-zA-Z0-9+.-]*):/;

/* Heuristic to detect the "localhost:3000 trap" */

function looksLikeHostname(scheme: string): boolean {
  return scheme === "localhost" || scheme.includes(".");
}

/* Validates and normalizes a URL entered by the user */

export function normalizeUrl(input: string): URL {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    throw new PixenError("INVALID_URL", "The URL is empty.", {
      context: { input },
    });
  }

  const schemeMatch = SCHEME_RE.exec(trimmed);
  const candidate = schemeMatch ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch (cause) {
    throw new PixenError("INVALID_URL", `Could not parse "${input}" as a URL.`, {
      cause,
      context: { input },
    });
  }

  if (parsed.protocol === "http:" || parsed.protocol === "https:") {
    return parsed;
  }

  const scheme = schemeMatch?.[1] ?? parsed.protocol.replace(/:$/, "");

  if (looksLikeHostname(scheme)) {
    throw new PixenError(
      "INVALID_URL",
      `"${input}" looks like a host without a schema. Try "http://${input}" or "https://${input}".`,
      { context: { input, detectedScheme: scheme } },
    );
  }

  throw new PixenError(
    "INVALID_URL",
    `Unsupported scheme: "${scheme}:". Only http:// and https:// are allowed.`,
    { context: { input, detectedScheme: scheme } },
  );
}
