import { useDeckStore } from "@/lib/deck-store";
import { GenerateForm } from "./generate-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

export function GenerateDialog() {
  const open = useDeckStore((s) => s.generateOpen);
  const setOpen = useDeckStore((s) => s.setGenerateOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate a scientific deck</DialogTitle>
          <DialogDescription>
            Sixteen microbiology disciplines, citation-ready slides, open scientific media.
          </DialogDescription>
        </DialogHeader>
        <GenerateForm />
      </DialogContent>
    </Dialog>
  );
}
