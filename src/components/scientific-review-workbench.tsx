import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { readLocalRecord, writeLocalRecord } from "@/lib/durable-storage";
import { saveFile } from "@/lib/desktop";
import {
  canonicalReviewerForm,
  serializeReviewerDraft,
  draftCheckpoints,
  newReviewerDraft,
  openReviewerDraft,
  openReviewerPack,
  reviewFormIssues,
  reviewRasterPreview,
  reviewSourceUrl,
  type ReviewerPack,
  type ScientificReviewForm,
} from "@/lib/review-session";
type Checkpoint = { savedAt: number; form: ScientificReviewForm };
export function ScientificReviewWorkbench() {
  const [open, setOpen] = useState(false);
  const [pack, setPack] = useState<ReviewerPack | null>(null);
  const [form, setForm] = useState<ScientificReviewForm | null>(null);
  const [itemId, setItemId] = useState("");
  const [query, setQuery] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const pendingSave = useRef<(() => void) | null>(null);
  const currentPack = useRef("");
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [completionChecked, setCompletionChecked] = useState(false);
  const saveVersion = useRef(0);
  const [recoveries, setRecoveries] = useState<Checkpoint[]>([]);
  const history = useRef<Checkpoint[]>([]);
  const writes = useRef(Promise.resolve());
  const loading = useRef(0);

  const filtered =
    pack?.items.filter(
      (i) =>
        (!pendingOnly || form?.decisions.find((d) => d.id === i.id)?.verdict === "pending") &&
        `${i.slide} ${i.field} ${i.text}`.toLowerCase().includes(query.toLowerCase()),
    ) || [];
  const selected = filtered.find((i) => i.id === itemId) || filtered[0];
  const position = selected ? filtered.findIndex((i) => i.id === selected.id) : -1;
  const decision = form?.decisions.find((d) => d.id === selected?.id);
  const pending = form?.decisions.filter((d) => d.verdict === "pending").length || 0;
  function change(next: ScientificReviewForm) {
    setDirty(true);
    setForm({ ...next, completedAt: "" });
    setIssues([]);
    setCompletionChecked(false);
    setError("");
  }
  function editDecision(patch: Partial<ScientificReviewForm["decisions"][number]>) {
    if (form && selected)
      change({
        ...form,
        decisions: form.decisions.map((d) => (d.id === selected.id ? { ...d, ...patch } : d)),
      });
  }
  function nextItem(direction: number) {
    if (filtered.length)
      setItemId(filtered[Math.max(0, Math.min(filtered.length - 1, position + direction))].id);
  }
  async function saveDraft(completed = false) {
    if (!pack || !form) return;
    const problems = completed ? reviewFormIssues(pack, form) : [];
    if (completed) {
      setIssues(problems);
      setCompletionChecked(true);
    }
    if (completed && problems.length) {
      setError(
        "Complete every decision, rationale, source link and reviewer declaration before exporting a completed form.",
      );
      return;
    }
    const output = {
      ...(completed ? canonicalReviewerForm(form) : form),
      completedAt: completed ? new Date().toISOString() : "",
    };
    try {
      await saveFile(
        completed ? "reviewer-completed.json" : "reviewer-draft.json",
        new TextEncoder().encode(serializeReviewerDraft(output)),
        "json",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review form could not be saved.");
    }
  }
  useEffect(() => {
    const version = ++saveVersion.current;
    if (!pack || !form || !dirty) return;
    try {
      serializeReviewerDraft(form);
    } catch {
      setSaveStatus(
        "Review draft is too large to save. Shorten oversized entries; earlier saved versions were preserved.",
      );
      return;
    }
    setSaveStatus("Saving review draft…");
    const key = `scientific-review-draft:${pack.packHash}`;
    const checkpoints = draftCheckpoints(history.current, form);
    let enqueued = false;
    const persist = () => {
      if (enqueued) return;
      enqueued = true;
      history.current = checkpoints;
      writes.current = writes.current
        .catch(() => {})
        .then(() => writeLocalRecord(key, JSON.stringify(checkpoints)));
      void writes.current.then(
        () => {
          if (version === saveVersion.current)
            setSaveStatus("Review draft saved on this device. Reopen the same pack to restore it.");
        },
        () => {
          if (version === saveVersion.current)
            setSaveStatus("Local draft save failed — download your review draft now.");
        },
      );
    };
    pendingSave.current = persist;
    const timer = setTimeout(persist, 400);
    return () => {
      clearTimeout(timer);
      persist();
      if (pendingSave.current === persist) pendingSave.current = null;
    };
  }, [pack, form, dirty]);
  async function clearLocalDrafts() {
    if (!pack) return;
    const hash = pack.packHash;
    setBusy(true);
    setError("");
    try {
      pendingSave.current?.();
      await writes.current.catch(() => {});
      writes.current = writes.current
        .catch(() => {})
        .then(() => writeLocalRecord(`scientific-review-draft:${hash}`, null));
      await writes.current;
      if (currentPack.current === hash) {
        setDirty(false);
        history.current = [];
        setRecoveries([]);
        setSaveStatus(
          "Saved draft copies removed for this pack. The open form is unchanged; further edits start saving again.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saved draft copies could not be removed.");
    } finally {
      setBusy(false);
    }
  }
  async function load(file?: File) {
    if (!file) return;
    const token = ++loading.current;
    setBusy(true);
    setError("");
    setIssues([]);
    try {
      if (file.size > 8 * 1024 * 1024) throw Error("Review pack must be smaller than 8 MB.");
      const loaded = await openReviewerPack(await file.text());
      pendingSave.current?.();
      await writes.current.catch(() => {});
      let recoveryWarning = "";
      let raw: string | null = null;
      try {
        raw = await readLocalRecord(`scientific-review-draft:${loaded.packHash}`);
      } catch {
        recoveryWarning =
          "Local recovery history could not be read. Download a review draft to keep your work.";
      }
      const saved: Checkpoint[] = [];
      if (raw) {
        try {
          const records = JSON.parse(raw);
          if (Array.isArray(records))
            for (const record of records.slice(0, 3))
              if (Number.isFinite(record.savedAt))
                saved.push({
                  savedAt: record.savedAt,
                  form: openReviewerDraft(loaded, JSON.stringify(record.form)),
                });
        } catch {
          recoveryWarning =
            "A saved draft could not be read. The original record was kept; current decisions were not replaced.";
        }
      }
      if (token !== loading.current) return;
      history.current = saved;
      setRecoveries(saved);
      currentPack.current = loaded.packHash;
      setDirty(false);
      setCompletionChecked(false);
      setPack(loaded);
      setForm(newReviewerDraft(loaded));
      setItemId(loaded.items[0].id);
      setQuery("");
      setPendingOnly(false);
      setSaveStatus(recoveryWarning);
    } catch (e) {
      if (token === loading.current)
        setError(e instanceof Error ? e.message : "Review pack could not be opened.");
    } finally {
      if (token === loading.current) setBusy(false);
    }
  }
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Complete an external review
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="w-[min(1100px,calc(100vw-1.5rem))]"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
              e.preventDefault();
              e.stopPropagation();
              void saveDraft();
            }
            if (e.altKey && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
              e.preventDefault();
              e.stopPropagation();
              nextItem(e.key === "ArrowLeft" ? -1 : 1);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Scientific reviewer workspace</DialogTitle>
            <DialogDescription>
              Review one pack independently, without changing the lecturer’s deck. Files and draft
              decisions stay on this device. Human identity and qualifications are not authenticated
              here.
            </DialogDescription>
          </DialogHeader>
          <fieldset className="min-w-0 space-y-4" disabled={busy}>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block text-xs">
                Open scientific review pack
                <input
                  type="file"
                  accept=".json,application/json"
                  className="mt-1 block min-h-11 max-w-full text-xs"
                  disabled={busy}
                  onChange={(e) => {
                    void load(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {pack && form && (
                <label className="block text-xs">
                  Resume my review file
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="mt-1 block min-h-11 max-w-full text-xs"
                    disabled={busy}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      try {
                        if (file.size > 8 * 1024 * 1024) throw Error("Review file exceeds 8 MB.");
                        const resumed = openReviewerDraft(pack, await file.text());
                        if (currentPack.current !== pack.packHash)
                          throw Error(
                            "Review pack changed while the file was read. Reopen the matching review file.",
                          );
                        change(resumed);
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : "Review file could not be resumed.",
                        );
                      }
                    }}
                  />
                </label>
              )}
            </div>
            {busy && (
              <p role="status" className="text-sm">
                Checking pack integrity…
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            {pack && form && (
              <>
                <section className="space-y-2 rounded border border-border bg-elevated p-3">
                  <h3 className="font-serif text-lg">{pack.topic}</h3>
                  <p className="text-xs">
                    {pack.slides} slides · {pack.items.length - pending}/{pack.items.length}{" "}
                    decisions entered · {pending} pending. Entered decisions may still need
                    rationale or sources.
                  </p>
                  <progress
                    className="h-2 w-full accent-accent"
                    aria-label="Review decisions entered"
                    value={pack.items.length - pending}
                    max={pack.items.length}
                  />
                  <p className="text-xs text-muted">
                    Inspect study conditions, uncertainty, clinical currency, figure accuracy and
                    redundancy. Do not use “Not factual” to bypass sourcing a factual statement.
                    Alt+Left/Right: items · Ctrl/Cmd+S: save draft.
                  </p>
                </section>
                {!!recoveries.length && (
                  <details className="rounded border border-border p-3">
                    <summary className="cursor-pointer text-sm">
                      Restore my saved review draft
                    </summary>
                    <p className="my-2 text-xs text-muted">
                      Use only your own decisions. Independent reviewers should use separate devices
                      or browser profiles.
                    </p>
                    {recoveries.map((r, i) => (
                      <Button
                        key={i}
                        size="sm"
                        variant="secondary"
                        className="m-1"
                        onClick={() => {
                          change(r.form);
                          setRecoveries([]);
                        }}
                      >
                        Restore {new Date(r.savedAt).toLocaleString()}
                      </Button>
                    ))}
                  </details>
                )}
                <details className="rounded border border-border p-3">
                  <summary className="cursor-pointer text-sm">
                    Reviewer details and independence declaration
                  </summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs">
                      Reviewer identifier
                      <Input
                        value={form.reviewer.id}
                        maxLength={200}
                        onChange={(e) =>
                          change({ ...form, reviewer: { ...form.reviewer, id: e.target.value } })
                        }
                      />
                    </label>
                    <label className="text-xs">
                      Qualifications and domain expertise
                      <Input
                        value={form.reviewer.credentials}
                        maxLength={3000}
                        onChange={(e) =>
                          change({
                            ...form,
                            reviewer: { ...form.reviewer, credentials: e.target.value },
                          })
                        }
                      />
                    </label>
                    <label className="text-xs sm:col-span-2">
                      Conflict-of-interest declaration
                      <Input
                        value={form.reviewer.conflictDeclaration}
                        maxLength={3000}
                        onChange={(e) =>
                          change({
                            ...form,
                            reviewer: { ...form.reviewer, conflictDeclaration: e.target.value },
                          })
                        }
                      />
                    </label>
                    <label className="flex items-start gap-2 text-xs sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={form.reviewer.independent}
                        onChange={(e) =>
                          change({
                            ...form,
                            reviewer: { ...form.reviewer, independent: e.target.checked },
                          })
                        }
                      />
                      I conducted my own scientific assessment and did not use another reviewer’s
                      decisions as my answers.
                    </label>
                  </div>
                </details>
                <div className="grid min-w-0 gap-4 lg:grid-cols-3">
                  <section className="min-w-0 space-y-3">
                    <label className="block text-xs">
                      Search review items
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Slide number, heading, phrase…"
                      />
                    </label>
                    <label className="flex gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={pendingOnly}
                        onChange={(e) => setPendingOnly(e.target.checked)}
                      />
                      Only pending decisions
                    </label>
                    <label className="block text-xs">
                      Review item
                      <select
                        className="mt-1 min-h-11 w-full min-w-0 rounded border border-border bg-elevated p-2"
                        aria-label="Review item"
                        value={selected?.id || ""}
                        onChange={(e) => setItemId(e.target.value)}
                      >
                        {filtered.map((item) => (
                          <option key={item.id} value={item.id}>
                            Slide {item.slide} · {item.field} · {item.id}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={position <= 0}
                        onClick={() => nextItem(-1)}
                      >
                        Previous item
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={position < 0 || position >= filtered.length - 1}
                        onClick={() => nextItem(1)}
                      >
                        Next item
                      </Button>
                    </div>
                    <p className="text-xs text-muted">
                      {filtered.length} matching items. Titles, notes, bullets and figure metadata
                      are separate review items.
                    </p>
                  </section>
                  <section className="min-w-0 space-y-3 lg:col-span-2">
                    {!selected || !decision ? (
                      <p className="text-sm">No matching review items.</p>
                    ) : (
                      <>
                        <h3 className="text-sm font-medium">
                          Slide {selected.slide} · {selected.field} · {selected.id}
                        </h3>
                        <blockquote className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-elevated p-3 text-sm">
                          {selected.text}
                        </blockquote>
                        {selected.claims?.map((claim, i) => (
                          <details key={i} className="rounded border border-border p-3" open>
                            <summary className="cursor-pointer text-xs">
                              Recorded evidence · {claim.classification}
                            </summary>
                            {claim.evidence.map((e, j) => (
                              <div key={j} className="mt-2 space-y-1 text-xs">
                                <p>
                                  {e.access} · {e.locator}
                                </p>
                                <blockquote className="whitespace-pre-wrap break-words">
                                  {e.quote}
                                </blockquote>
                                {reviewSourceUrl(e.sourceUrl) && (
                                  <a
                                    className="break-all underline"
                                    href={reviewSourceUrl(e.sourceUrl)!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Open supporting source
                                  </a>
                                )}
                              </div>
                            ))}
                          </details>
                        ))}
                        {selected.citations?.map((c, i) => (
                          <p key={i} className="break-words text-xs">
                            {c.authors} {c.year} · {c.title}{" "}
                            {reviewSourceUrl(
                              c.url ||
                                (c.doi
                                  ? `https://doi.org/${c.doi}`
                                  : c.pmid
                                    ? `https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/`
                                    : ""),
                            ) && (
                              <a
                                className="underline"
                                target="_blank"
                                rel="noopener noreferrer"
                                href={reviewSourceUrl(
                                  c.url ||
                                    (c.doi
                                      ? `https://doi.org/${c.doi}`
                                      : `https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/`),
                                )!}
                              >
                                Reference
                              </a>
                            )}
                          </p>
                        ))}
                        {selected.media && (
                          <div className="space-y-2 text-xs">
                            <p>
                              Figure: {selected.media.title} · {selected.media.credit} ·{" "}
                              {selected.media.license}
                            </p>
                            {reviewRasterPreview(selected.media.src) ? (
                              <img
                                className="max-h-80 w-full object-contain"
                                src={reviewRasterPreview(selected.media.src)!}
                                alt={selected.media.title}
                              />
                            ) : (
                              <p>
                                Inspect figure pixels in the original source or exported lecture;
                                metadata alone is insufficient.
                              </p>
                            )}
                            {reviewSourceUrl(selected.media.source) && (
                              <a
                                className="underline"
                                href={reviewSourceUrl(selected.media.source)!}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Open original figure source
                              </a>
                            )}
                          </div>
                        )}
                        <label className="block text-xs">
                          Decision
                          <select
                            className="mt-1 min-h-11 w-full rounded border border-border bg-elevated p-2"
                            aria-label="Decision"
                            value={decision.verdict}
                            onChange={(e) =>
                              editDecision({ verdict: e.target.value as typeof decision.verdict })
                            }
                          >
                            {[
                              ["pending", "Pending"],
                              ["supported", "Supported by checked evidence"],
                              ["revise", "Revise — scientific or contextual problem"],
                              ["remove", "Remove"],
                              ["not-factual", "Not a factual assertion"],
                            ].map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-xs">
                          Scientific rationale
                          <Textarea
                            aria-label="Scientific rationale"
                            value={decision.rationale}
                            maxLength={10000}
                            onChange={(e) => editDecision({ rationale: e.target.value })}
                            placeholder="Explain support, errors, missing conditions or qualifications…"
                          />
                        </label>
                        <label className="block text-xs">
                          Checked source URLs — one per line
                          <Textarea
                            aria-label="Checked source URLs — one per line"
                            rows={2}
                            value={decision.sourceUrls.join("\n")}
                            onChange={(e) =>
                              editDecision({ sourceUrls: e.target.value.split("\n") })
                            }
                            placeholder="https://…"
                          />
                        </label>
                        <label className="block text-xs">
                          Redundant with item IDs — comma separated
                          <Input
                            value={decision.redundantWith.join(", ")}
                            onChange={(e) =>
                              editDecision({
                                redundantWith: e.target.value.split(/[\s,]+/).filter(Boolean),
                              })
                            }
                            placeholder="item-0002, item-0007"
                          />
                        </label>
                      </>
                    )}
                  </section>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  <Button size="sm" variant="secondary" onClick={() => void saveDraft()}>
                    Save review draft
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setIssues(reviewFormIssues(pack, form));
                      setCompletionChecked(true);
                      toast.message(
                        "Completion checks do not authenticate the reviewer or certify the science.",
                      );
                    }}
                  >
                    Check review completion
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void clearLocalDrafts()}>
                    Remove saved draft copies
                  </Button>
                  <Button size="sm" onClick={() => void saveDraft(true)}>
                    Export completed reviewer form
                  </Button>
                </div>
                <p role="status" className="text-xs text-muted">
                  {saveStatus}
                </p>
                {completionChecked && !issues.length && (
                  <p role="status" className="text-xs">
                    All decisions and declarations are complete. Reviewer identity and scientific
                    conclusions remain unverified by this app.
                  </p>
                )}
                {!!issues.length && (
                  <div className="space-y-1 text-xs" role="status">
                    <p>
                      {issues.length} completion issues. No completed form is exported until these
                      are resolved.
                    </p>
                    {issues.slice(0, 20).map((issue, i) => (
                      <p key={i}>{issue}</p>
                    ))}
                  </div>
                )}
              </>
            )}
          </fieldset>
        </DialogContent>
      </Dialog>
    </>
  );
}
