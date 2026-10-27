import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { isDesktop } from "@/lib/desktop";
import { useDeckStore } from "@/lib/deck-store";
import { exportTeachingPdf } from "@/lib/export-teaching";
import { exportPptx, pptxFileName } from "@/lib/export-pptx";
import type { Deck } from "@/lib/types";

export function useDeckExports(deck: Deck | null | undefined, workspaceEpoch: number) {
  const [exportError, setExportError] = useState("");
  const [pptxBusy, setPptxBusy] = useState(false);
  const pptxWriting = useRef(false);
  const [preparedPptx, setPreparedPptx] = useState<{
    url: string;
    name: string;
    deckId: string;
    updatedAt: number;
  } | null>(null);
  const pptxDownload = useRef<HTMLElement>(null);
  const exportErrorAlert = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (preparedPptx) pptxDownload.current?.scrollIntoView({ block: "nearest" });
    return () => {
      if (preparedPptx) URL.revokeObjectURL(preparedPptx.url);
    };
  }, [preparedPptx]);
  useEffect(() => {
    if (exportError) exportErrorAlert.current?.scrollIntoView({ block: "nearest" });
  }, [exportError]);
  useEffect(() => {
    setExportError("");
    setPreparedPptx(null);
  }, [deck?.id]);
  async function onPptx() {
    const startedEpoch = workspaceEpoch;
    if (pptxWriting.current) return;
    pptxWriting.current = true;
    setPptxBusy(true);
    setExportError("");
    try {
      const candidate = deck;
      if (!candidate) return;
      if (isDesktop()) {
        await exportPptx(candidate, { classroom: false });
      } else {
        const bytes = await exportPptx(candidate, { classroom: false, returnBytes: true });
        if (!(bytes instanceof Uint8Array) || !bytes.length)
          throw Error("PowerPoint generation returned no file. Your deck is preserved.");
        // Keep the URL alive until replacement or unmount. Mobile browsers may
        // require a fresh user tap after asynchronous generation has completed.
        const url = URL.createObjectURL(
          new Blob([new Uint8Array(bytes)], {
            type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          }),
        );
        const name = pptxFileName(candidate);
        if (useDeckStore.getState().deck()?.id !== candidate.id) {
          URL.revokeObjectURL(url);
          throw Error("The active deck changed. Export the deck you want again.");
        }
        setPreparedPptx({ url, name, deckId: candidate.id, updatedAt: candidate.updatedAt });
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        document.body.append(link);
        link.click();
        link.remove();
      }
      toast.message("PowerPoint file prepared. Use Download PowerPoint if it did not save.");
    } catch (e) {
      if (useDeckStore.getState().workspaceEpoch === startedEpoch)
        setExportError(e instanceof Error ? e.message : "Could not write the PPTX file.");
    } finally {
      pptxWriting.current = false;
      setPptxBusy(false);
    }
  }
  const [preparedPdf, setPreparedPdf] = useState<{
    url: string;
    name: string;
    deckId: string;
  } | null>(null);
  useEffect(
    () => () => {
      if (preparedPdf) URL.revokeObjectURL(preparedPdf.url);
    },
    [preparedPdf],
  );
  useEffect(() => {
    setPreparedPdf(null);
  }, [deck?.id]);
  const [printing, setPrinting] = useState(false);
  async function onPdf() {
    const startedEpoch = workspaceEpoch;
    setExportError("");
    const candidate = deck;
    if (!candidate) return;
    setPrinting(true);
    try {
      if (isDesktop()) {
        await exportTeachingPdf(candidate, { reviewed: false });
        return;
      }
      const bytes = await exportTeachingPdf(candidate, { reviewed: false, returnBytes: true });
      if (!(bytes instanceof Uint8Array)) throw Error("PDF generation returned no file.");
      if (useDeckStore.getState().deck()?.id !== candidate.id) return;
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
      );
      const name = `${candidate.title.replace(/[^\p{L}\p{N}-]/gu, "-").slice(0, 80) || "lecture"}.pdf`;
      setPreparedPdf({ url, name, deckId: candidate.id });
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.append(a);
      a.click();
      a.remove();
    } catch (e) {
      if (useDeckStore.getState().workspaceEpoch === startedEpoch)
        setExportError(e instanceof Error ? e.message : "PDF export failed.");
    } finally {
      setPrinting(false);
    }
  }

  return {
    exportError,
    pptxBusy,
    pptxDownload,
    exportErrorAlert,
    onPptx,
    preparedPptx,
    preparedPdf,
    printing,
    onPdf,
  };
}
