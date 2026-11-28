import type { PixenWarning, PresetName } from "@/pixen/models/index.js";

/**
 * Builds a warning if the document height changed between the pre-capture
 * measurement and the post-capture re-measurement.
 */
export function detectHeightChange(
  heightBeforeCss: number,
  heightAfterCss: number,
  presetName: PresetName,
): PixenWarning | null {
  if (heightBeforeCss === heightAfterCss) {
    return null;
  }

  const deltaCss = heightAfterCss - heightBeforeCss;

  return {
    code: "HEIGHT_CHANGED_DURING_CAPTURE",
    message: `Page height changed during capture (${presetName}): ${heightBeforeCss}px → ${heightAfterCss}px (delta ${deltaCss}px).`,
    data: {
      preset: presetName,
      heightBeforeCss,
      heightAfterCss,
      deltaCss,
    },
  };
}
