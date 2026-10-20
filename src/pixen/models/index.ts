export type { PixenErrorCode } from "./errors.js";
export { PixenError } from "./errors.js";

export type { RunOptions } from "./options.js";

export type {
  DeviceHints,
  PresetName,
  SheetFormat,
  Viewport,
  ViewportPreset,
} from "./preset.js";
export {
  PRESET_DESKTOP,
  PRESET_MOBILE,
  PRESET_TABLET,
  PRESETS,
  PRESETS_BY_NAME,
} from "./preset.js";
export type { ReferenceResult } from "./result.js";
export type {
  PixenWarning,
  PixenWarningCode,
  WarningCollector,
} from "./warnings.js";
export { InMemoryWarningCollector } from "./warnings.js";
