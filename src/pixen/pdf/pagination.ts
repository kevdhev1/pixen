/*
 * A single vertical chunk of the page, expressed in both device pixels
 * (the PNG coordinate space) and CSS pixels (the original layout space).
 */
export type PageChunk = {
  readonly index: number;
  readonly yDevicePx: number;
  readonly heightDevicePx: number;
  readonly yCssPx: number;
  readonly heightCssPx: number;
  readonly isLast: boolean;
};

export type PlanChunksInput = {
  readonly pageHeightCss: number;
  readonly deviceScaleFactor: number;
  readonly chunkWidthCss: number;
  /*
   * Sheet aspect ratio, width / height.
   * A4 landscape: 297/210 ≈ 1.414. A4 portrait: 210/297 ≈ 0.707.
   */
  readonly aspectRatio: number;
};

/*
 * Splits a page into vertical chunks whose height matches the destination
 * sheet's aspect ratio (proportional pagination).
 */
export function planChunks(input: PlanChunksInput): readonly PageChunk[] {
  const { pageHeightCss, deviceScaleFactor, chunkWidthCss, aspectRatio } = input;

  if (!Number.isFinite(pageHeightCss) || pageHeightCss <= 0) {
    throw new Error(`pageHeightCss must be a positive finite number, got ${pageHeightCss}`);
  }
  if (!Number.isFinite(deviceScaleFactor) || deviceScaleFactor <= 0) {
    throw new Error(`deviceScaleFactor must be a positive finite number, got ${deviceScaleFactor}`);
  }
  if (!Number.isFinite(chunkWidthCss) || chunkWidthCss <= 0) {
    throw new Error(`chunkWidthCss must be a positive finite number, got ${chunkWidthCss}`);
  }
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    throw new Error(`aspectRatio must be a positive finite number, got ${aspectRatio}`);
  }

  const pageHeightDevice = Math.round(pageHeightCss * deviceScaleFactor);

  if (pageHeightDevice <= 0) {
    throw new Error(
      `pageHeightCss=${pageHeightCss} with deviceScaleFactor=${deviceScaleFactor} resolves to ${pageHeightDevice} device px, expected at least 1`,
    );
  }

  const chunkWidthDevice = Math.round(chunkWidthCss * deviceScaleFactor);
  const chunkHeightDevice = Math.round(chunkWidthDevice / aspectRatio);

  if (chunkHeightDevice <= 0) {
    throw new Error(
      `chunkWidthCss=${chunkWidthCss} with deviceScaleFactor=${deviceScaleFactor} and aspectRatio=${aspectRatio} resolves to chunkHeightDevice=${chunkHeightDevice}, expected at least 1`,
    );
  }

  const chunks: PageChunk[] = [];
  let yDevicePx = 0;
  let index = 0;

  while (yDevicePx < pageHeightDevice) {
    const remaining = pageHeightDevice - yDevicePx;
    const heightDevicePx = Math.min(chunkHeightDevice, remaining);
    const isLast = yDevicePx + heightDevicePx >= pageHeightDevice;

    chunks.push({
      index,
      yDevicePx,
      heightDevicePx,
      yCssPx: yDevicePx / deviceScaleFactor,
      heightCssPx: heightDevicePx / deviceScaleFactor,
      isLast,
    });

    yDevicePx += heightDevicePx;
    index++;
  }

  return chunks;
}
