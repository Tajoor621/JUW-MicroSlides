import { JUW } from "@/lib/brand";

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <img
        src={JUW.crestMark}
        alt="Jinnah University for Women"
        className="size-9 shrink-0 object-contain"
      />
      <div className="min-w-0 leading-tight">
        <div className="truncate font-serif text-[15px] tracking-tight text-fg">{JUW.name}</div>
        {!compact && (
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted">
            {JUW.version} · lecture studio
          </div>
        )}
      </div>
    </div>
  );
}
