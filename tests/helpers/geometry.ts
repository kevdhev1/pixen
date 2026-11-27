import type { PageInfo, ViewportPreset } from "@/pixen/models/index.js";

export type Geometry = {
  dpr: number;
  chunkWidthDevice: number;
  chunkHeightDevice: number;
  blockHeightCss: number;
  chunksPerBlock: number;
};

export function gcd(a: number, b: number): number {
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }

  return a;
}

/* Derives chunk/block geometry for a preset */
export function geometryOf(preset: ViewportPreset): Geometry {
  const dpr = preset.deviceScaleFactor;
  const chunkWidthDevice = preset.viewport.width * dpr;
  const aspect = preset.sheetFormat === "A4_LANDSCAPE" ? 297 / 210 : 210 / 297;
  const chunkHeightDevice = Math.round(chunkWidthDevice / aspect);
  const k = dpr / gcd(chunkHeightDevice, dpr);
  const blockHeightCss = (k * chunkHeightDevice) / dpr;

  return {
    dpr,
    chunkWidthDevice,
    chunkHeightDevice,
    blockHeightCss,
    chunksPerBlock: k,
  };
}

export function makePageInfo(documentHeight: number): PageInfo {
  return {
    title: "ruler",
    finalUrl: "https://example.com/",
    documentHeight,
    hasHorizontalOverflow: false,
  };
}
