import path from "node:path";
import type { PresetName } from "@/pixen/models/preset.js";
import type { SectionLabel } from "@/pixen/output/vocabulary.js";

/* Allowed extensions for section images */
export type SectionImageExtension = "webp" | "png" | "jpg" | "jpeg";

/* Path to a preset's PDF */
export function getPdfPath(outputDir: string, presetName: PresetName): string {
  return path.join(outputDir, "pdf", `${presetName}.pdf`);
}

/* Path to a preset's sections folder */
export function getSectionsDir(outputDir: string, presetName: PresetName): string {
  return path.join(outputDir, "sections", presetName);
}

/* Input data for constructing a section filename */

export type SectionFileNameInput = {
  /* 1-based index of the section within the preset */
  readonly index: number;

  /* Closed-vocabulary tag */
  readonly label: SectionLabel;

  /* Image extension */
  readonly extension: SectionImageExtension;

  /**
   * Part number if the section was divided vertically.
   * If omitted, no suffix is added.
   */
  readonly part?: number;
};

/* Build the filename of a section */
export function getSectionFileName(input: SectionFileNameInput): string {
  const { index, label, extension, part } = input;

  if (!Number.isInteger(index) || index < 1) {
    throw new Error(`Invalid section index: ${index}. Must be an integer >= 1.`);
  }

  if (part !== undefined && (!Number.isInteger(part) || part < 2)) {
    throw new Error(`Invalid part number: ${part}. Must be an integer >= 2.`);
  }

  const indexStr = String(index).padStart(3, "0");
  const partSuffix = part !== undefined ? `-part-${part}` : "";

  return `${indexStr}-${label}${partSuffix}.${extension}`;
}

/* Full path to a section file */
export function getSectionPath(
  outputDir: string,
  presetName: PresetName,
  input: SectionFileNameInput,
): string {
  return path.join(getSectionsDir(outputDir, presetName), getSectionFileName(input));
}
