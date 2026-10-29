import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
export const replacements = {
  organize: "organise",
  organized: "organised",
  organizes: "organises",
  organizing: "organising",
  organization: "organisation",
  organizational: "organisational",
  generalized: "generalised",
  specialized: "specialised",
  optimized: "optimised",
  stabilization: "stabilisation",
  organizations: "organisations",
  color: "colour",
  colors: "colours",
  center: "centre",
  centered: "centred",
  behavior: "behaviour",
  behaviors: "behaviours",
  analyze: "analyse",
  analyzed: "analysed",
  analyzes: "analyses",
  analyzing: "analysing",
  license: "licence",
  licenses: "licences",
  hemolytic: "haemolytic",
  anemia: "anaemia",
  esophagus: "oesophagus",
  program: "programme",
  programs: "programmes",
  immobilization: "immobilisation",
  immobilized: "immobilised",
  visualization: "visualisation",
  normalization: "normalisation",
  characterization: "characterisation",
  localization: "localisation",
  artifacts: "artefacts",
  artifact: "artefact",
};
const pattern = new RegExp("\\b(" + Object.keys(replacements).join("|") + ")\\b", "gi");
export function toUK(text) {
  return text.replace(pattern, (word) => {
    const uk = replacements[word.toLowerCase()];
    return word === word.toUpperCase()
      ? uk.toUpperCase()
      : word[0] === word[0].toUpperCase()
        ? uk[0].toUpperCase() + uk.slice(1)
        : uk;
  });
}
function files(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(root, e.name)) : [join(root, e.name)],
  );
}
export function sourceTextNodes(file, source) {
  const tree = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    ),
    nodes = [];
  function visit(n) {
    if (
      ts.isJsxText(n) ||
      ts.isStringLiteral(n) ||
      ts.isNoSubstitutionTemplateLiteral(n) ||
      ts.isTemplateHead(n) ||
      ts.isTemplateMiddle(n) ||
      ts.isTemplateTail(n)
    ) {
      const p = n.parent;
      const code =
        ts.isImportDeclaration(p) ||
        ts.isExportDeclaration(p) ||
        ts.isLiteralTypeNode(p) ||
        ts.isElementAccessExpression(p) ||
        (ts.isPropertyAssignment(p) && p.name === n) ||
        (ts.isJsxAttribute(p) &&
          /^(className|style|id|key|href|src|download|type|value|target|rel|accept)$/.test(
            p.name.getText(tree),
          )) ||
        (!ts.isJsxText(n) &&
          ((!/[\s]/.test(n.text) && n.text === n.text.toLowerCase()) ||
            /^(?:[\w./-]+)\.(?:txt|md|json|png|svg|ttf)$/.test(n.text) ||
            /^(?:https?:|data:|\.\.?\/|\/|--|#[a-f\d]|\^)/i.test(n.text) ||
            /^(?:inline-flex|flex|grid|absolute|relative|fixed|border|rounded|text-|bg-|items-|justify-|mx-|my-|w-|h-|px-|py-)/.test(
              n.text,
            )));
      if (!code) {
        const text = ts.isJsxText(n) ? n.getText(tree) : n.text;
        if (text.match(pattern))
          nodes.push({
            start: n.getStart(tree),
            end: n.end,
            text,
            line: tree.getLineAndCharacterOfPosition(n.getStart(tree)).line + 1,
          });
      }
    }
    ts.forEachChild(n, visit);
  }
  visit(tree);
  return nodes;
}
export function check() {
  const allow = JSON.parse(readFileSync("scripts/uk-english-exceptions.json", "utf8"));
  let errors = [];
  for (const file of files("src").filter((f) => /\.tsx?$/.test(f))) {
    const source = readFileSync(file, "utf8");
    for (const n of sourceTextNodes(file, source))
      if (!allow.some((e) => e.file === file && e.text === n.text))
        errors.push(`${file}:${n.line}: ${n.text}`);
  }
  // Markdown code, inline identifiers, quoted source titles and explicit spelling examples are preserved.
  for (const file of ["README.md", ...files("docs").filter((f) => f.endsWith(".md"))]) {
    const source = readFileSync(file, "utf8")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]+`/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/“[^”]*”/g, "");
    if (file === "docs/STYLE-UK.md") continue;
    for (const [i, line] of source.split("\n").entries())
      if (line.match(pattern)) errors.push(`${file}:${i + 1}: ${line}`);
  }
  return errors;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  {
    const errors = check();
    if (errors.length) {
      console.error(errors.join("\n"));
      process.exitCode = 1;
    } else console.log("PASS UK English authored strings and documentation");
  }
}
