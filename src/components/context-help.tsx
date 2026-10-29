const help = {
  edit: "Select a slide, then edit its title, bullets, notes, layout, and theme. Changes save on this browser. Use Library to download an editable backup before major edits. Undo/Redo are available there; Ctrl/Cmd+Z also works outside text fields.",
  media:
    "Find media collects public image and video candidates from Commons and Openverse. Download files separately, inspect source/licence links, then attach chosen images manually. Social-platform shortcuts open public search pages; they do not bypass sign-in or import every post. Video files can be downloaded, but slide embedding supports images.",
  cite: "Search PubMed or OpenAlex online, then attach a reference to the selected slide. Open and read the source to check that it supports the slide. A search hit is not a fact check.",
  evidence:
    "Paste an exported reference list. Review imported authors, year, title, and DOI before attaching. Elicit support imports exports; it does not connect to your account.",
  notes:
    "Enter any microbiology topic to generate source-attributed study notes. Download a source-traced A4 portrait PDF. Unsupported statements are omitted; treatment statements require a dated guideline. Notes save on this device independently from the slide deck and are included in JSON backups. Supplied material works offline; research needs connectivity, and AI needs a configured model.",
  copilot:
    "For AI on Pages, configure your own Ollama server and installed model in Settings, then select AI mode. Paid cloud AI is not part of the supported product. Always review generated claims. Never put private API keys into a public website.",
};
export function ContextHelp({ tab }: { tab: keyof typeof help }) {
  return (
    <details className="rounded border border-border p-2 text-xs">
      <summary className="cursor-pointer font-medium">Help: {tab}</summary>
      <p className="mt-2 leading-relaxed text-muted">{help[tab]}</p>
      <p className="mt-2 text-muted">
        For personal educational use. Not for distribution. Not an official publication of Jinnah
        University for Women.
      </p>
    </details>
  );
}
