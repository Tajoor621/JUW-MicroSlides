import { scientificRuns } from "@/lib/scientific-format";
/** Presentation markup only. Original strings, evidence quotes and claim hashes stay intact. */
export function ScientificText({ text }: { text: string }) {
  return (
    <>
      {scientificRuns(text).map((run, i) => (run.italic ? <em key={i}>{run.text}</em> : run.text))}
    </>
  );
}
