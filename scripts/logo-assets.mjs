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
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    console.log(inspectPng(readFileSync(process.argv[2] || "public/juw-microscope.png")));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
