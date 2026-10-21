import { useState } from "react";
import { FirstDeckWizard } from "./first-deck-wizard";
import { Button } from "./ui/button";
import { useDeckStore } from "@/lib/deck-store";
import { GenerateForm } from "./generate-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

export function GenerateDialog() {
  const [guided, setGuided] = useState(false);
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
        <Button variant="secondary" onClick={() => setGuided(!guided)}>
          {guided ? "Show full generator" : "Guided First Deck setup"}
        </Button>
        {guided ? <FirstDeckWizard /> : <GenerateForm />}
      </DialogContent>
    </Dialog>
  );
}
