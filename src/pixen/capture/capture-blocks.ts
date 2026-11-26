import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Page } from "playwright";
import sharp from "sharp";
import { takeFullPageScreenshot } from "@/pixen/capture/screenshot.js";
import {
  type ChunkArtifact,
  type PageInfo,
  PixenError,
  type ViewportPreset,
} from "@/pixen/models/index.js";
import { planCaptureBlocks } from "@/pixen/pdf/capture-blocks.js";

const HEIGHT_TOLERANCE_PX = 2;

export type CaptureBlocksResult = {
  readonly chunks: readonly ChunkArtifact[];
  readonly omittedDevicePx: number;
};

/*
 * Captures the page once, then crops each planned block and splits each block
 * into its chunks. Block PNGs are written to disk temporarily and deleted
 * immediately after being split into chunks.
 */
export async function captureBlocks(
  page: Page,
  preset: ViewportPreset,
  pageInfo: PageInfo,
  workspacePath: string,
): Promise<CaptureBlocksResult> {
  const plan = planCaptureBlocks(pageInfo.documentHeight, preset);
  const dpr = preset.deviceScaleFactor;
  const chunkWidthDevice = preset.viewport.width * dpr;
  const pageHeightDevice = pageInfo.documentHeight * dpr;

  const fullBuffer = await takeFullPageScreenshot(page);

  const fullMeta = await sharp(fullBuffer).metadata();
  const fullWidth = fullMeta.width ?? 0;
  const fullHeight = fullMeta.height ?? 0;

  if (fullWidth < chunkWidthDevice) {
    throw new PixenError(
      "CAPTURE_FAILED",
      `Full-page capture narrower than expected: ${fullWidth}px < ${chunkWidthDevice}px.`,
      { context: { expectedWidth: chunkWidthDevice, actualWidth: fullWidth } },
    );
  }

  if (fullHeight < pageHeightDevice - HEIGHT_TOLERANCE_PX) {
    throw new PixenError(
      "CAPTURE_FAILED",
      `Full-page capture shorter than expected: ${fullHeight}px < ${pageHeightDevice}px.`,
      {
        context: {
          expectedHeight: pageHeightDevice,
          actualHeight: fullHeight,
          tolerance: HEIGHT_TOLERANCE_PX,
        },
      },
    );
  }

  const presetDir = path.join(workspacePath, preset.name);
  await mkdir(presetDir, { recursive: true });

  const chunks: ChunkArtifact[] = [];
  let conservedDevicePx = 0;

  for (const block of plan.blocks) {
    const blockY = block.yCssPx * dpr;
    const blockH = block.heightCssPx * dpr;

    const blockBuffer = await sharp(fullBuffer)
      .extract({ left: 0, top: blockY, width: chunkWidthDevice, height: blockH })
      .png()
      .toBuffer();

    const blockMeta = await sharp(blockBuffer).metadata();
    const blockActualW = blockMeta.width ?? 0;
    const blockActualH = blockMeta.height ?? 0;

    if (blockActualW !== chunkWidthDevice || blockActualH !== blockH) {
      throw new PixenError(
        "CAPTURE_FAILED",
        `Block ${block.index} dimensions mismatch: expected ${chunkWidthDevice}×${blockH}, got ${blockActualW}×${blockActualH}.`,
        {
          context: {
            blockIndex: block.index,
            expectedWidth: chunkWidthDevice,
            expectedHeight: blockH,
            actualWidth: blockActualW,
            actualHeight: blockActualH,
          },
        },
      );
    }

    const blockTempPath = path.join(presetDir, `block-${String(block.index).padStart(4, "0")}.png`);
    await writeFile(blockTempPath, blockBuffer);

    let summedHeight = 0;

    for (const fragment of block.fragments) {
      const chunkBuffer = await sharp(blockBuffer)
        .extract({
          left: 0,
          top: fragment.yDevicePx,
          width: chunkWidthDevice,
          height: fragment.heightDevicePx,
        })
        .png()
        .toBuffer();

      const chunkMeta = await sharp(chunkBuffer).metadata();
      const cw = chunkMeta.width ?? 0;
      const ch = chunkMeta.height ?? 0;

      if (cw !== chunkWidthDevice || ch !== fragment.heightDevicePx) {
        throw new PixenError(
          "CAPTURE_FAILED",
          `Chunk ${block.index}/${fragment.index} dimensions mismatch: expected ${chunkWidthDevice}×${fragment.heightDevicePx}, got ${cw}×${ch}.`,
          {
            context: {
              blockIndex: block.index,
              fragmentIndex: fragment.index,
              expectedWidth: chunkWidthDevice,
              expectedHeight: fragment.heightDevicePx,
              actualWidth: cw,
              actualHeight: ch,
            },
          },
        );
      }

      summedHeight += ch;

      const chunkPath = path.join(
        presetDir,
        `block-${String(block.index).padStart(4, "0")}-chunk-${String(fragment.index).padStart(2, "0")}.png`,
      );
      await writeFile(chunkPath, chunkBuffer);

      chunks.push({
        preset: preset.name,
        blockIndex: block.index,
        fragmentIndex: fragment.index,
        path: chunkPath,
        widthPx: cw,
        heightPx: ch,
        bytes: chunkBuffer.byteLength,
      });
    }

    if (summedHeight > blockH) {
      throw new PixenError(
        "CAPTURE_FAILED",
        `Block ${block.index} chunks exceed block height: ${summedHeight}px > ${blockH}px.`,
        {
          context: {
            blockIndex: block.index,
            summedHeight,
            blockH,
          },
        },
      );
    }
    conservedDevicePx += summedHeight;

    await unlink(blockTempPath);
  }

  // Conservation check: every device row of the page must be either conserved
  // (as part of a chunk) or explicitly omitted by the plan. This catches both
  // a chunk silently missing and a plan/execution drift, and is robust to the
  // case where the last partial block is not captured at all.
  if (conservedDevicePx + plan.omittedDevicePx !== pageHeightDevice) {
    throw new PixenError(
      "CAPTURE_FAILED",
      `Conserved (${conservedDevicePx}px) + omitted (${plan.omittedDevicePx}px) does not equal page height (${pageHeightDevice}px).`,
      {
        context: {
          conservedDevicePx,
          omittedDevicePx: plan.omittedDevicePx,
          pageHeightDevice,
        },
      },
    );
  }

  return { chunks, omittedDevicePx: plan.omittedDevicePx };
}
