/** Scientific exports must be self-contained and must not fetch active SVG resources. */
export function safeExportSvg(xml: string) {
  if (xml.length > 5_000_000 || /<!ENTITY|<!DOCTYPE/i.test(xml))
    throw Error("Unsupported SVG declaration.");
  const doc = new DOMParser().parseFromString(xml, "image/svg+xml");
  if (doc.querySelector("parsererror") || doc.documentElement.localName !== "svg")
    throw Error("Invalid SVG figure.");
  if (
    doc.querySelector(
      "script,foreignObject,iframe,object,embed,animate,animateMotion,animateTransform,set",
    )
  )
    throw Error("SVG contains active content. Use a static self-contained figure.");
  const nodes = [...doc.querySelectorAll("*")];
  if (nodes.length > 10000) throw Error("SVG figure is too complex.");
  for (const node of nodes) {
    for (const attr of node.attributes) {
      if (/^on/i.test(attr.name))
        throw Error("SVG event handlers are not allowed in teaching exports.");
      if (
        /(?:^|:)href$/i.test(attr.name) &&
        !attr.value.startsWith("#") &&
        !/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(attr.value)
      )
        throw Error("SVG must embed its images and use local references.");
    }
  }
  if (/@import/i.test(xml)) throw Error("SVG styles must be self-contained.");
  for (const match of xml.matchAll(/url\(([^)]*)\)/gi)) {
    const ref = match[1].trim().replace(/^['"]|['"]$/g, "");
    if (!ref.startsWith("#") && !/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(ref))
      throw Error("SVG contains an external resource. Embed it before export.");
  }
  return new XMLSerializer().serializeToString(doc.documentElement);
}
