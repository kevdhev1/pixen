import type { ViewportPreset } from "@/pixen/models/index.js";

/**
 * A fragment is a chunk-sized (or remainder-sized) vertical region inside a
 * capture block.
 */
export type CaptureFragment = {
  readonly index: number;
  readonly yDevicePx: number;
  readonly heightDevicePx: number;
};

/* A block is a region of the page that is captured as one image */
export type CaptureBlock = {
  readonly index: number;
  readonly yCssPx: number;
  readonly heightCssPx: number;
  readonly fragments: readonly CaptureFragment[];
};

export type CapturePlan = {
  readonly blocks: readonly CaptureBlock[];
  readonly omittedDevicePx: number;
};

/* Remainders smaller than this (in CSS px) are omitted */
const OMIT_THRESHOLD_CSS = 32;

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function sheetAspectRatio(preset: ViewportPreset): number {
  return preset.sheetFormat === "A4_LANDSCAPE" ? 297 / 210 : 210 / 297;
}

function chunkHeightDevice(preset: ViewportPreset): number {
  const chunkWidthDevice = Math.round(preset.viewport.width * preset.deviceScaleFactor);
  return Math.round(chunkWidthDevice / sheetAspectRatio(preset));
}

/**
 * Smallest integer number of chunks whose total CSS height is an integer.
 * Equals `k × chunkHeightDevice / DPR` where `k = DPR / gcd(chunkHeightDevice, DPR)`.
 */
function blockHeightCss(preset: ViewportPreset): number {
  const dpr = preset.deviceScaleFactor;
  const chunkDev = chunkHeightDevice(preset);
  const k = dpr / gcd(chunkDev, dpr);
  return (k * chunkDev) / dpr;
}

/* Number of chunks contained in one full block */
function chunksPerBlock(preset: ViewportPreset): number {
  const dpr = preset.deviceScaleFactor;
  return dpr / gcd(chunkHeightDevice(preset), dpr);
}

/*
 * Splits a page into capture blocks and the chunks within each block, applying
 * a partial-block remainder shorter than 32 CSS px is discarded, and if the
 * partial block ends up with no surviving chunk, the block is not captured at all.
 */
export function planCaptureBlocks(pageHeightCss: number, preset: ViewportPreset): CapturePlan {
  if (!Number.isFinite(pageHeightCss) || pageHeightCss <= 0) {
    throw new Error(`pageHeightCss must be a positive finite number, got ${pageHeightCss}`);
  }

  const H = Math.round(pageHeightCss);
  if (H !== pageHeightCss) {
    throw new Error(`pageHeightCss must be an integer, got ${pageHeightCss}`);
  }

  const dpr = preset.deviceScaleFactor;
  const chunkDev = chunkHeightDevice(preset);
  const blockCss = blockHeightCss(preset);
  const perBlock = chunksPerBlock(preset);
  const omitThresholdDevice = OMIT_THRESHOLD_CSS * dpr;
  const pageHeightDevice = H * dpr;

  if (pageHeightDevice < omitThresholdDevice) {
    throw new Error(
      `page height ${pageHeightCss} CSS px (${pageHeightDevice} device px) is below the omission threshold of ${OMIT_THRESHOLD_CSS} CSS px (${omitThresholdDevice} device px); no chunks survive`,
    );
  }

  const fullBlocksCount = Math.floor(H / blockCss);
  const partialCss = H - fullBlocksCount * blockCss;

  const blocks: CaptureBlock[] = [];

  for (let i = 0; i < fullBlocksCount; i++) {
    const fragments: CaptureFragment[] = [];

    for (let j = 0; j < perBlock; j++) {
      fragments.push({
        index: j,
        yDevicePx: j * chunkDev,
        heightDevicePx: chunkDev,
      });
    }

    blocks.push({
      index: i,
      yCssPx: i * blockCss,
      heightCssPx: blockCss,
      fragments,
    });
  }

  if (partialCss > 0) {
    const partialDevice = partialCss * dpr;
    const nFullChunks = Math.floor(partialDevice / chunkDev);
    const r = partialDevice - nFullChunks * chunkDev;
    const keepRemainder = r >= omitThresholdDevice;

    const fragments: CaptureFragment[] = [];

    for (let j = 0; j < nFullChunks; j++) {
      fragments.push({
        index: j,
        yDevicePx: j * chunkDev,
        heightDevicePx: chunkDev,
      });
    }

    if (keepRemainder && r > 0) {
      fragments.push({
        index: nFullChunks,
        yDevicePx: nFullChunks * chunkDev,
        heightDevicePx: r,
      });
    }

    if (fragments.length > 0) {
      blocks.push({
        index: blocks.length,
        yCssPx: fullBlocksCount * blockCss,
        heightCssPx: partialCss,
        fragments,
      });
    }
  }

  const conservedDevicePx = blocks.reduce(
    (sum, b) => sum + b.fragments.reduce((s, f) => s + f.heightDevicePx, 0),
    0,
  );
  const omittedDevicePx = pageHeightDevice - conservedDevicePx;

  return { blocks, omittedDevicePx };
}
