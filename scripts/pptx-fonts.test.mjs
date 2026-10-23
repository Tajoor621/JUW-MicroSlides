import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import PptxGenJS from "pptxgenjs";
import JSZip from "jszip";
import { XMLValidator, XMLParser } from "fast-xml-parser";
import { eotFont, embedPortableFonts } from "../src/lib/pptx-fonts.ts";
const regular = new Uint8Array(
  await readFile(new URL("../public/fonts/DejaVuSans.ttf", import.meta.url)),
);
const bold = new Uint8Array(
  await readFile(new URL("../public/fonts/DejaVuSans-Bold.ttf", import.meta.url)),
);
const license = await readFile(new URL("../public/fonts/LICENSE.txt", import.meta.url), "utf8");
function inspectEot(bytes, original, weight) {
  const b = Buffer.from(bytes);
  assert.equal(b.readUInt32LE(0), b.length);
  assert.equal(b.readUInt32LE(4), original.length);
  assert.equal(b.readUInt32LE(8), 0x20001);
  assert.equal(b.readUInt32LE(12), 0);
  assert.equal(b.readUInt16LE(34), 0x504c);
  assert.equal(b.readUInt16LE(32), 0);
  assert.equal(b.readUInt32LE(28), weight);
  let offset = 80;
  const names = [];
  for (let n = 0; n < 4; n++) {
    assert.equal(b.readUInt16LE(offset), 0);
    const length = b.readUInt16LE(offset + 2);
    offset += 4;
    names.push(b.subarray(offset, offset + length).toString("utf16le"));
    offset += length;
  }
  assert.equal(names[0], "DejaVu Sans");
  assert.equal(names[1], weight === 700 ? "Bold" : "Book");
  assert.equal(b.readUInt32LE(offset), 0);
  assert.deepEqual(b.subarray(offset + 4), Buffer.from(original));
}
test("portable EOT carries the complete unmodified editable regular and bold TrueType fonts", () => {
  inspectEot(eotFont(regular).bytes, regular, 400);
  inspectEot(eotFont(bold).bytes, bold, 700);
  assert.throws(() => eotFont(new Uint8Array(100)), /TrueType/);
  const invalid = regular.slice();
  new DataView(invalid.buffer).setUint32(20, invalid.length + 1);
  assert.throws(() => eotFont(invalid), /bounds/);
  const restricted = regular.slice();
  const view = new DataView(restricted.buffer);
  for (let i = 0; i < view.getUint16(4); i++) {
    const pos = 12 + i * 16;
    if (Buffer.from(restricted.subarray(pos, pos + 4)).toString() === "OS/2")
      view.setUint16(view.getUint32(pos + 8) + 8, 2);
  }
  assert.throws(() => eotFont(restricted), /editable/);
});
test("editable PowerPoint has valid font parts, relationships, licence and PresentationML order", async () => {
  const pptx = new PptxGenJS();
  pptx.subject = "Synthetic packaging test only";
  pptx
    .addSlide()
    .addText("Editable α β η text", { x: 1, y: 1, w: 8, h: 1, fontFace: "DejaVu Sans" });
  const source = new Uint8Array(await pptx.write({ outputType: "arraybuffer" }));
  // XML normalizes CRLF to LF, including on Windows checkouts.
  const metadataLicense = license.replace(/\r?\n/g, "\r\n");
  const bytes = await embedPortableFonts(source, regular, bold, metadataLicense);
  const zip = await JSZip.loadAsync(bytes);
  for (const entry of Object.values(zip.files).filter((x) => /\.xml$|\.rels$/.test(x.name)))
    assert.equal(XMLValidator.validate(await entry.async("string")), true, entry.name);
  const p = await zip.file("ppt/presentation.xml").async("string");
  assert.match(p, /embedTrueTypeFonts="1"/);
  assert.match(p, /saveSubsetFonts="0"/);
  assert(p.indexOf("<p:embeddedFontLst>") < p.indexOf("<p:defaultTextStyle>"));
  const parser = new XMLParser({ ignoreAttributes: false, trimValues: false });
  const list = parser.parse(p)["p:presentation"]["p:embeddedFontLst"]["p:embeddedFont"];
  assert.equal(list["p:font"]["@_typeface"], "DejaVu Sans");
  const rels = parser.parse(await zip.file("ppt/_rels/presentation.xml.rels").async("string"))
    .Relationships.Relationship;
  for (const [kind, font, weight] of [
    ["regular", regular, 400],
    ["bold", bold, 700],
  ]) {
    const r = rels.find((r) => r["@_Id"] === list[`p:${kind}`]["@_r:id"]);
    assert.equal(
      r["@_Type"],
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font",
    );
    inspectEot(await zip.file(`ppt/${r["@_Target"]}`).async("uint8array"), font, weight);
  }
  assert.match(
    await zip.file("[Content_Types].xml").async("string"),
    /ContentType="application\/x-fontdata"/,
  );
  const core = parser.parse(await zip.file("docProps/core.xml").async("string"))[
    "cp:coreProperties"
  ];
  assert.equal(typeof core["dc:description"], "string");
  assert(core["dc:description"].includes(license.replace(/\r\n?/g, "\n")));
  const slide = await zip.file("ppt/slides/slide1.xml").async("string");
  assert.match(slide, /Editable α β η text/);
  assert.match(slide, /<a:latin typeface="DejaVu Sans"/);
  assert.equal(
    Object.keys(zip.files).filter((x) => /^ppt\/slides\/slide\d+\.xml$/.test(x)).length,
    1,
  );
  await assert.rejects(embedPortableFonts(bytes, regular, bold, license), /already contains/);
  await assert.rejects(embedPortableFonts(source, bold, regular, license), /identities/);
  await assert.rejects(embedPortableFonts(source, regular, bold, ""), /licence/);
});
