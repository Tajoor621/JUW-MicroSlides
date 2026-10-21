export function benchmarkPlan(cases, env = process.env) {
  const integer = (raw, fallback, min, max, name) => {
    const n = raw === undefined ? fallback : Number(raw);
    if (!Number.isInteger(n) || n < min || n > max)
      throw Error(`Invalid ${name}: use ${min}–${max}.`);
    return n;
  };
  const start = integer(env.JUW_BENCH_START, 0, 0, cases.length - 1, "start"),
    limit = integer(env.JUW_BENCH_LIMIT, 3, 1, cases.length, "limit"),
    stride = integer(env.JUW_BENCH_STRIDE, 1, 1, cases.length, "stride");
  const raw = env.JUW_BENCH_COUNTS;
  const counts =
    !raw || raw === "manifest"
      ? null
      : raw === "all"
        ? Array.from({ length: 50 }, (_, i) => i + 1)
        : raw.split(",").map((n) => {
            if (!/^\d+$/.test(n.trim()))
              throw Error("Counts must be manifest, all, or comma-separated integers 1–50.");
            return integer(n, 1, 1, 50, "slide count");
          });
  if (counts && new Set(counts).size !== counts.length) throw Error("Duplicate benchmark counts.");
  const topics = cases.filter((_, i) => i >= start && (i - start) % stride === 0).slice(0, limit);
  const jobs = topics.flatMap((c) =>
    (counts || [c.requestedCount]).map((count) => ({
      ...c,
      requestedCount: count,
      caseId: c.id,
      id: counts ? `${c.id}-n${String(count).padStart(2, "0")}` : c.id,
    })),
  );
  return { start, limit, stride, counts: counts || "manifest", topics: topics.length, jobs };
}
