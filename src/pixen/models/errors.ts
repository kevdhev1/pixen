/* Pixen Stable Error Codes */

export type PixenErrorCode =
  | "INVALID_URL"
  | "BROWSER_NOT_INSTALLED"
  | "BROWSER_LAUNCH_FAILED"
  | "NAVIGATION_FAILED"
  | "NAVIGATION_TIMEOUT"
  | "CAPTURE_FAILED"
  | "OUTPUT_EXISTS"
  | "OUTPUT_NOT_WRITABLE"
  | "IMAGE_PROCESSING_FAILED"
  | "PDF_GENERATION_FAILED"
  | "SECTION_DETECTION_FAILED"
  | "INTERNAL_ERROR";

/* Pixen typed error */

export class PixenError extends Error {
  readonly code: PixenErrorCode;
  readonly context: Readonly<Record<string, unknown>>;

  constructor(
    code: PixenErrorCode,
    message: string,
    options?: {
      cause?: unknown;
      context?: Record<string, unknown>;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = "PixenError";
    this.code = code;
    this.context = Object.freeze({ ...options?.context });
  }

  /* Type guard */

  static isPixenError(value: unknown): value is PixenError {
    return (
      value instanceof PixenError ||
      (typeof value === "object" &&
        value !== null &&
        "code" in value &&
        "name" in value &&
        (value as { name: unknown }).name === "PixenError")
    );
  }
}
