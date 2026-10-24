import JSZip from "jszip";

/** Uncompressed EOT v2.1 (Microsoft's EOT submission), not Word's ODTTF format.
 * Only application-bundled, editable/installable TrueType fonts are accepted. */
export function eotFont(bytes: Uint8Array) {
  if (bytes.length < 100 || bytes.length > 8_000_000) throw Error("Invalid portable font size.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0) !== 0x00010000) throw Error("Portable fonts require TrueType outlines.");
  const tables = new Map<string, { offset: number; length: number }>();
  const count = view.getUint16(4);
  if (count > 256 || 12 + count * 16 > bytes.length) throw Error("Invalid font table directory.");
  for (let i = 0; i < count; i++) {
    const pos = 12 + i * 16;
    const tag = String.fromCharCode(...bytes.subarray(pos, pos + 4));
    const offset = view.getUint32(pos + 8),
      length = view.getUint32(pos + 12);
    if (offset + length > bytes.length) throw Error("Portable font table exceeds file bounds.");
    tables.set(tag, { offset, length });
  }
  const table = (tag: string, size: number) => {
    const entry = tables.get(tag);
    if (!entry || entry.length < size) throw Error(`Portable font lacks a valid ${tag} table.`);
    return entry.offset;
  };
  const os2 = table("OS/2", 78),
    head = table("head", 12),
    name = table("name", 6);
  const fsType = view.getUint16(os2 + 8);
  // Full fonts are embedded; no subsetting, bitmap-only or read-only workaround.
  if (fsType & 0x0200 || ((fsType & 0x000e) !== 0 && !(fsType & 0x0008)))
    throw Error("This font does not permit editable outline embedding.");
  const entries = view.getUint16(name + 2),
    strings = name + view.getUint16(name + 4);
  const nameEnd = name + tables.get("name")!.length;
  if (name + 6 + entries * 12 > nameEnd || strings > nameEnd) throw Error("Invalid font names.");
  const names = new Map<number, string>();
  for (let i = 0; i < entries; i++) {
    const pos = name + 6 + i * 12;
    const platform = view.getUint16(pos),
      language = view.getUint16(pos + 4),
      id = view.getUint16(pos + 6);
    if (platform !== 3 || language !== 0x0409) continue;
    const length = view.getUint16(pos + 8),
      offset = strings + view.getUint16(pos + 10);
    if (length % 2 || offset + length > nameEnd) throw Error("Invalid font name string.");
    let value = "";
    for (let j = 0; j < length; j += 2) value += String.fromCharCode(view.getUint16(offset + j));
    names.set(id, value);
  }
  const family = names.get(1),
    style = names.get(2),
    version = names.get(5),
    full = names.get(4);
  if (!family || !style || !version || !full) throw Error("Portable font names are incomplete.");
  const strings16 = [family, style, version, full].map((value) => {
    if (value.length * 2 > 65535) throw Error("Portable font name exceeds EOT bounds.");
    const encoded = new Uint8Array(value.length * 2);
    const v = new DataView(encoded.buffer);
    for (let i = 0; i < value.length; i++) v.setUint16(i * 2, value.charCodeAt(i), true);
    return encoded;
  });
  // 80-byte fixed header, then padding/name-length pairs and an empty root string.
  const headerLength = 80 + strings16.reduce((n, s) => n + 4 + s.length, 0) + 4;
  const result = new Uint8Array(headerLength + bytes.length),
    out = new DataView(result.buffer);
  out.setUint32(0, result.length, true);
  out.setUint32(4, bytes.length, true);
  out.setUint32(8, 0x00020001, true);
  result.set(bytes.subarray(os2 + 32, os2 + 42), 16);
  result[26] = 1; // DEFAULT_CHARSET
  result[27] = view.getUint16(os2 + 62) & 1;
  out.setUint32(28, view.getUint16(os2 + 4), true);
  out.setUint16(32, fsType, true);
  out.setUint16(34, 0x504c, true);
  for (let i = 0; i < 4; i++) out.setUint32(36 + i * 4, view.getUint32(os2 + 42 + i * 4), true);
  if (tables.get("OS/2")!.length >= 86)
    for (let i = 0; i < 2; i++) out.setUint32(52 + i * 4, view.getUint32(os2 + 78 + i * 4), true);
  out.setUint32(60, view.getUint32(head + 8), true);
  let pos = 80;
  for (const value of strings16) {
    pos += 2; // Zero padding
    out.setUint16(pos, value.length, true);
    pos += 2;
    result.set(value, pos);
    pos += value.length;
  }
  pos += 4; // Zero padding and RootStringSize=0; bundled fonts permit unrestricted embedding.
  result.set(bytes, pos);
  return { bytes: result, family, bold: view.getUint16(os2 + 4) >= 600, italic: !!result[27] };
}

const escapeXml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
export async function embedPortableFonts(
  pptx: Uint8Array,
  regular: Uint8Array,
  bold: Uint8Array,
  license: string,
  italic?: Uint8Array,
  boldItalic?: Uint8Array,
) {
  const fonts = [eotFont(regular), eotFont(bold)];
  if (fonts.some((f) => f.family !== "DejaVu Sans" || f.italic) || fonts[0].bold || !fonts[1].bold)
    throw Error("Portable font identities do not match the bundled regular/bold family.");
  if (Boolean(italic) !== Boolean(boldItalic)) throw Error("Both italic font faces are required.");
  if (italic && boldItalic) {
    const extra = [eotFont(italic), eotFont(boldItalic)];
    if (
      extra.some((f) => f.family !== "DejaVu Sans" || !f.italic) ||
      extra[0].bold ||
      !extra[1].bold
    )
      throw Error("Portable italic font identities do not match.");
    fonts.push(...extra);
  }
  if (!license.includes("Bitstream") || !license.includes("Permission"))
    throw Error("Bundled font licence is missing.");
  const zip = await JSZip.loadAsync(pptx);
  const read = async (path: string) => {
    const entry = zip.file(path);
    if (!entry) throw Error(`PowerPoint package lacks ${path}.`);
    return entry.async("string");
  };
  let presentation = await read("ppt/presentation.xml");
  let relationships = await read("ppt/_rels/presentation.xml.rels");
  let types = await read("[Content_Types].xml");
  let core = await read("docProps/core.xml");
  if (/<p:embeddedFontLst\b/.test(presentation) || /rIdJuwFont/.test(relationships))
    throw Error("PowerPoint already contains an embedded font list.");
  presentation = presentation.replace(
    /<p:presentation\b([^>]*)>/,
    (_all, attrs: string) =>
      `<p:presentation${attrs.replace(/\s(?:embedTrueTypeFonts|saveSubsetFonts)="[^"]*"/g, "")} embedTrueTypeFonts="1" saveSubsetFonts="0">`,
  );
  const fontList = `<p:embeddedFontLst><p:embeddedFont><p:font typeface="DejaVu Sans"/><p:regular r:id="rIdJuwFontRegular"/><p:bold r:id="rIdJuwFontBold"/>${italic ? '<p:italic r:id="rIdJuwFontItalic"/><p:boldItalic r:id="rIdJuwFontBoldItalic"/>' : ""}</p:embeddedFont></p:embeddedFontLst>`;
  // PresentationML child order places fonts before defaultTextStyle.
  if (!presentation.includes("<p:defaultTextStyle>"))
    throw Error("Unsupported PowerPoint presentation structure.");
  presentation = presentation.replace("<p:defaultTextStyle>", fontList + "<p:defaultTextStyle>");
  for (const [i, suffix] of [
    "Regular",
    "Bold",
    ...(italic ? ["Italic", "BoldItalic"] : []),
  ].entries()) {
    const path = `fonts/juw-dejavu-${suffix.toLowerCase()}.fntdata`;
    zip.file(`ppt/${path}`, fonts[i].bytes);
    relationships = relationships.replace(
      "</Relationships>",
      `<Relationship Id="rIdJuwFont${suffix}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="${path}"/></Relationships>`,
    );
  }
  if (!/Extension="fntdata"/.test(types))
    types = types.replace(
      "</Types>",
      '<Default Extension="fntdata" ContentType="application/x-fontdata"/></Types>',
    );
  const attribution = escapeXml(
    `Portable fonts: DejaVu Sans, regular and bold, plus italic faces when present; full editable fonts, uncompressed EOT.\n${license}`,
  );
  core = core.replace(/<dc:description\s*\/>/, "<dc:description></dc:description>");
  core = core.includes("</dc:description>")
    ? core.replace("</dc:description>", `\n${attribution}</dc:description>`)
    : core.replace(
        "</cp:coreProperties>",
        `<dc:description>${attribution}</dc:description></cp:coreProperties>`,
      );
  zip.file("ppt/presentation.xml", presentation);
  zip.file("ppt/_rels/presentation.xml.rels", relationships);
  zip.file("[Content_Types].xml", types);
  zip.file("docProps/core.xml", core);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export async function loadPortableFonts() {
  const read = async (path: string) => {
    const response = await fetch(`${import.meta.env.BASE_URL}fonts/${path}`, {
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw Error("Font asset unavailable");
    return response;
  };
  try {
    const [regular, bold, italic, boldItalic, license] = await Promise.all([
      read("DejaVuSans.ttf").then((r) => r.arrayBuffer()),
      read("DejaVuSans-Bold.ttf").then((r) => r.arrayBuffer()),
      read("DejaVuSans-Oblique.ttf").then((r) => r.arrayBuffer()),
      read("DejaVuSans-BoldOblique.ttf").then((r) => r.arrayBuffer()),
      read("LICENSE.txt").then((r) => r.text()),
    ]);
    return {
      regular: new Uint8Array(regular),
      bold: new Uint8Array(bold),
      italic: new Uint8Array(italic),
      boldItalic: new Uint8Array(boldItalic),
      license,
    };
  } catch {
    throw Error("Portable fonts are unavailable. Reconnect and retry; your deck is preserved.");
  }
}
