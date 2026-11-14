import { boxes, fourcc } from "./box.js";

const HEVC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs"]);

// Inspect bytes only. Names and MIME types supplied by pickers are not evidence
// of the encoding. A HEIF container must still pass discoverHeic's layout checks.
export function identifyFormat(bytes) {
  if (!bytes.length) return "empty";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  const png = [137, 80, 78, 71, 13, 10, 26, 10];
  if (png.every((value, i) => bytes[i] === value)) return "png";

  for (const b of boxes(bytes, 0, bytes.length)) {
    if (b.type !== "ftyp") continue;
    const start = b.off + b.hdr, end = b.off + b.size;
    if (end - start < 8 || (end - start) % 4) return "malformed";
    const brands = [fourcc(bytes, start)];
    // Skip minor_version; it is not a compatible brand.
    for (let p = start + 8; p + 4 <= end; p += 4) brands.push(fourcc(bytes, p));
    // AVIF also advertises mif1. It must never enter the HEVC metadata pipeline.
    if (brands.some((brand) => brand === "avif" || brand === "avis")) return "avif";
    if (brands.some((brand) => HEVC_BRANDS.has(brand))) return "heic";
    if (brands.some((brand) => brand === "mif1" || brand === "msf1")) return "heif";
    return "iso";
  }
  if (bytes.length >= 8 && fourcc(bytes, 4) === "ftyp") return "malformed";
  return "unknown";
}
