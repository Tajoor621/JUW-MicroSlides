import { inflateSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
export function inspectPng(bytes, minLongest = 1200) {
  if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
    throw Error("Asset is not a PNG; check for JPEG bytes saved with a .png name.");
  const width = bytes.readUInt32BE(16),
    height = bytes.readUInt32BE(20);
  if (Math.max(width, height) < minLongest)
    throw Error(`logo resolution below target: ${width} × ${height}; ${minLongest}px required.`);
  return { width, height };
}
/** Decode this repository's non-interlaced RGBA PNG for alpha qualification. */
export function inspectTransparentPng(bytes) {
  const size = inspectPng(bytes);
  if (bytes[24] !== 8 || bytes[25] !== 6 || bytes[28] !== 0)
    throw Error("Transparent branding must be an 8-bit RGBA, non-interlaced PNG.");
  const blocks = [];
  for (let at = 8; at + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(at);
    if (at + length + 12 > bytes.length) throw Error("Invalid PNG chunk length.");
    const kind = bytes.toString("ascii", at + 4, at + 8);
    if (kind === "IDAT") blocks.push(bytes.subarray(at + 8, at + 8 + length));
    at += length + 12;
    if (kind === "IEND") break;
  }
  const stride = size.width * 4;
  const raw = inflateSync(Buffer.concat(blocks), { maxOutputLength: 64 * 1024 * 1024 });
  if (raw.length !== (stride + 1) * size.height) throw Error("Incomplete PNG pixels.");
  let previous = Buffer.alloc(stride),
    transparent = 0,
    opaque = 0;
  const corners = [];
  for (let y = 0; y < size.height; y++) {
    const filter = raw[y * (stride + 1)];
    if (filter > 4) throw Error("Unknown PNG filter.");
    const row = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? row[x - 4] : 0,
        b = previous[x],
        c = x >= 4 ? previous[x - 4] : 0;
      const p = a + b - c,
        distances = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
      const prediction = [a, b, c][distances.indexOf(Math.min(...distances))];
      row[x] = (row[x] + [0, a, b, Math.floor((a + b) / 2), prediction][filter]) & 255;
    }
    for (let x = 0; x < size.width; x++) {
      const alpha = row[x * 4 + 3];
      if (alpha === 0) transparent++;
      if (alpha >= 240) opaque++;
      if ((y === 0 || y === size.height - 1) && (x === 0 || x === size.width - 1))
        corners.push(alpha);
    }
    previous = row;
  }
  return { ...size, corners, transparent, opaque };
}
export function inspectJpeg(bytes, minLongest = 1200) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw Error("Asset is not a JPEG.");
  let i = 2;
  while (i + 8 < bytes.length) {
    if (bytes[i] !== 0xff) throw Error("Malformed JPEG marker.");
    const marker = bytes[i + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const length = bytes.readUInt16BE(i + 2);
    if (length < 2 || i + 2 + length > bytes.length) throw Error("Malformed JPEG length.");
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      const height = bytes.readUInt16BE(i + 5),
        width = bytes.readUInt16BE(i + 7);
      if (Math.max(width, height) < minLongest)
        throw Error(`logo resolution below target: ${width} × ${height}`);
      return { width, height };
    }
    i += 2 + length;
  }
  throw Error("JPEG dimensions were not found.");
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const path = process.argv[2] || "public/juw-department-microscope-transparent.png";
    console.log(
      path.endsWith(".png")
        ? inspectTransparentPng(readFileSync(path))
        : inspectJpeg(readFileSync(path)),
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
