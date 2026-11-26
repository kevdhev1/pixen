import type { Page } from "playwright";
import sharp from "sharp";

/**
 * Builds a PNG where each device row has a unique color encoding its index.
 * Row index → color: r = y & 0xff, g = (y >> 8) & 0xff, b = (y >> 16) & 0xff.
 */
export async function buildRulerPng(totalDeviceRows: number, widthDevice: number): Promise<Buffer> {
  const buf = Buffer.alloc(totalDeviceRows * widthDevice * 3);

  for (let y = 0; y < totalDeviceRows; y++) {
    const r = y & 0xff;
    const g = (y >> 8) & 0xff;
    const b = (y >> 16) & 0xff;

    for (let x = 0; x < widthDevice; x++) {
      const off = (y * widthDevice + x) * 3;

      buf[off] = r;
      buf[off + 1] = g;
      buf[off + 2] = b;
    }
  }

  return sharp(buf, { raw: { width: widthDevice, height: totalDeviceRows, channels: 3 } })
    .png()
    .toBuffer();
}

/**
 * Renders the ruler PNG into the page as a `<img>` scaled to fill the viewport,
 * so the page height matches `totalDeviceRows / dpr` CSS px exactly.
 */
export async function setRulerPage(
  page: Page,
  totalDeviceRows: number,
  dpr: number,
  widthDevice: number,
): Promise<void> {
  const png = await buildRulerPng(totalDeviceRows, widthDevice);
  const b64 = png.toString("base64");
  const cssWidth = widthDevice / dpr;
  const cssHeight = totalDeviceRows / dpr;

  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { margin: 0; }
          img {
            display: block;
            width: ${cssWidth}px;
            height: ${cssHeight}px;
            image-rendering: pixelated;
          }
        </style>
      </head>
      <body><img src="data:image/png;base64,${b64}" /></body>
    </html>
  `);
}

function decodeRowIndex(r: number, g: number, b: number): number {
  return r | (g << 8) | (b << 16);
}

/**
 * Reads the row indices encoded in the ruler image, sampling a single column
 * at `xDevice`. Returns one decoded index per device row.
 */
export async function readRowIndices(pngBuffer: Buffer, xDevice: number): Promise<number[]> {
  const meta = await sharp(pngBuffer).metadata();
  const height = meta.height ?? 0;
  const { data, info } = await sharp(pngBuffer)
    .extract({ left: xDevice, top: 0, width: 1, height })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const indices: number[] = [];

  for (let y = 0; y < height; y++) {
    const off = y * channels;
    const r = data[off] ?? 0;
    const g = data[off + 1] ?? 0;
    const b = data[off + 2] ?? 0;

    indices.push(decodeRowIndex(r, g, b));
  }

  return indices;
}
