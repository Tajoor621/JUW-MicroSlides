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
export function inspectJpeg(bytes, minLongest = 1200) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw Error("Asset is not a JPEG.");
  let i=2;
  while (i+8<bytes.length) {
    if (bytes[i] !== 0xff) throw Error("Malformed JPEG marker.");
    const marker=bytes[i+1];
    if (marker===0xda || marker===0xd9) break;
    const length=bytes.readUInt16BE(i+2);
    if (length<2 || i+2+length>bytes.length) throw Error("Malformed JPEG length.");
    if ([0xc0,0xc1,0xc2].includes(marker)) {
      const height=bytes.readUInt16BE(i+5),width=bytes.readUInt16BE(i+7);
      if (Math.max(width,height)<minLongest) throw Error(`logo resolution below target: ${width} × ${height}`);
      return {width,height};
    }
    i+=2+length;
  }
  throw Error("JPEG dimensions were not found.");
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const path=process.argv[2] || "public/juw-department-microscope-1254.jpeg";
    console.log(path.endsWith(".png") ? inspectPng(readFileSync(path)) : inspectJpeg(readFileSync(path)));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
