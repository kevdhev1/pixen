/* Pixen stable warning codes */

export type PixenWarningCode =
  | "SECTION_DETECTION_PARTIAL"
  | "LAZY_LOAD_TIMEOUT"
  | "FONT_LOAD_TIMEOUT"
  | "STICKY_ELEMENT_DETECTED"
  | "SCREENSHOT_SIZE_LIMIT"
  | "CROP_OUT_OF_BOUNDS";

/* Typed warning */

export type PixenWarning = {
  readonly code: PixenWarningCode;
  readonly message: string;
  readonly data: Readonly<Record<string, unknown>>;
};

export type WarningCollector = {
  add(warning: PixenWarning): void;
  list(): readonly PixenWarning[];
};

/* In-memory accumulation */

export class InMemoryWarningCollector implements WarningCollector {
  readonly #warnings: PixenWarning[] = [];

  add(warning: PixenWarning): void {
    this.#warnings.push(warning);
  }

  list(): readonly PixenWarning[] {
    return this.#warnings;
  }
}
