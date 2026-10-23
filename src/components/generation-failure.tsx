import { Button } from "./ui/button";

export function GenerationFailure({
  failure,
  currentTopic,
  onRetry,
}: {
  failure: { topic: string; count: number; message: string };
  currentTopic?: string;
  onRetry?: () => void;
}) {
  return (
    <section role="alert" className="space-y-2 rounded border border-accent bg-surface p-3 text-sm">
      <p className="font-semibold">Generation stopped: {failure.count} requested slides</p>
      <p className="line-clamp-2 break-words" title={failure.topic}>
        {failure.topic}
      </p>
      <p className="text-xs text-muted">
        Still displaying “{currentTopic}”. Your saved deck has not been replaced or renamed.
      </p>
      <details className="text-xs">
        <summary className="min-h-11 cursor-pointer py-3 text-accent">
          Request and recovery details
        </summary>
        <div className="space-y-2 break-words pb-2">
          <p>{failure.topic}</p>
          <p>{failure.message}</p>
          <p>
            Edit the request or add attributed source notes, then choose Generate deck to retry.
          </p>
        </div>
      </details>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Edit request and retry
        </Button>
      )}
    </section>
  );
}
