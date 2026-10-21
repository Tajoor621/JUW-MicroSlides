export function EvidenceBadge({
  basis,
  field,
}: {
  basis: Record<string, string[]>;
  field: string;
}) {
  return (
    <span
      className="ml-2 rounded border px-1 text-xs font-normal"
      aria-label="Evidence source type"
    >
      {basis[field]?.join(" / ") || "Evidence not classified"}
    </span>
  );
}
