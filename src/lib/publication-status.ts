import { readLocalRecord, writeLocalRecord } from "./durable-storage";
import type { Citation } from "./types";
export { publicationCheckSchema, type PublicationCheck } from "./publication-schema";
import { publicationCheckSchema, type PublicationCheck } from "./publication-schema";
export function citationIdentifier(c: Citation) {
  return (
    c.doi
      ?.replace(/^https?:\/\/(?:dx\.)?doi.org\//i, "")
      .toLowerCase()
      .trim() ||
    c.pmid?.trim() ||
    ""
  );
}
export function statusIsFresh(check: PublicationCheck, now = Date.now()) {
  return check.checkedAt <= now && now - check.checkedAt < 7 * 86400000;
}
export function publicationCheckIsCurrent(c: Citation, now = Date.now()) {
  const check = c.publicationCheck;
  return !!(
    citationIdentifier(c) &&
    check &&
    check.identifier === citationIdentifier(c) &&
    check.complete &&
    check.metadataMatch === true &&
    check.metadataTitle === c.title &&
    check.status === "no-notice-found" &&
    statusIsFresh(check, now)
  );
}
type NoticeRecord = { type?: string; id?: string; source?: string; reference?: string };
export function europeNotices(record: {
  isRetracted?: string;
  pubTypeList?: { pubType?: string[] };
  commentCorrectionList?: { commentCorrection?: NoticeRecord[] };
}): PublicationCheck["notices"] {
  const notices: PublicationCheck["notices"] = [];
  if (record.isRetracted === "Y" || record.pubTypeList?.pubType?.includes("Retracted Publication"))
    notices.push({ type: "retraction", url: "https://europepmc.org/ArticleStatusMonitor" });
  for (const n of record.commentCorrectionList?.commentCorrection || []) {
    // Only incoming notices change the target article. ErratumFor/RetractionOf describe a notice itself.
    const type = (n.type || "").replace(/[^a-z]/gi, "");
    if (/^(RetractionIn|ErratumIn|ExpressionOfConcernIn|UpdateIn)$/i.test(type))
      notices.push({
        type: n.type!,
        url:
          n.id && /^\d+$/.test(n.id) && n.source === "MED"
            ? `https://pubmed.ncbi.nlm.nih.gov/${n.id}/`
            : "https://europepmc.org/ArticleStatusMonitor",
      });
    else if (/^(RetractionOf|ErratumFor|ExpressionOfConcernFor)$/i.test(type))
      notices.push({
        type: `notice-record:${n.type}`,
        url: "https://europepmc.org/ArticleStatusMonitor",
      });
  }
  return notices;
}
export function crossrefNotices(
  record: Record<string, unknown>,
  targetDoi: string,
): PublicationCheck["notices"] {
  const list = (record["update-to"] || []) as { DOI?: string; type?: string }[];
  // A notice's update-to points at the original. Never treat an outgoing correction as proof the notice was corrected.
  return list
    .filter((n) => n.DOI?.toLowerCase() === targetDoi.toLowerCase())
    .map((n) => ({
      type: n.type || "update",
      url: `https://doi.org/${String(record.DOI || targetDoi)}`,
    }));
}
export function noticeStatus(
  notices: PublicationCheck["notices"],
  complete: boolean,
): PublicationCheck["status"] {
  const types = notices.map((n) => n.type).join(" ");
  if (/notice-record/.test(types)) return "notice";
  if (/retract|withdraw/i.test(types)) return "retracted";
  if (/concern/i.test(types)) return "concern";
  if (/errat|correct|update/i.test(types)) return "corrected";
  return complete ? "no-notice-found" : "unknown";
}
async function json(url: string) {
  const r = await fetch(url, { credentials: "omit", signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw Error(`Metadata ${r.status}`);
  return r.json();
}
export async function checkPublication(
  c: Citation,
): Promise<PublicationCheck & { cached?: boolean }> {
  const identifier = citationIdentifier(c);
  const key = `publication-status:${identifier}`;
  let cached: PublicationCheck | undefined;
  try {
    cached = publicationCheckSchema.parse(JSON.parse((await readLocalRecord(key)) || "null"));
  } catch {
    /* no valid cache */
  }
  const notices: PublicationCheck["notices"] = [],
    providers: string[] = [];
  const tasks: Promise<void>[] = [];
  if (c.pmid || c.doi)
    tasks.push(
      (async () => {
        const query =
          c.pmid && /^\d+$/.test(c.pmid)
            ? `EXT_ID:${c.pmid} AND SRC:MED`
            : `DOI:"${identifier.replace(/["\\]/g, "")}"`;
        const data = await json(
          `https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=core&query=${encodeURIComponent(query)}`,
        );
        const record = data.resultList?.result?.find((r: { pmid?: string; doi?: string }) =>
          c.pmid ? r.pmid === c.pmid : r.doi?.toLowerCase() === identifier,
        );
        if (!record) throw Error("Not indexed");
        notices.push(...europeNotices(record));
        providers.push("Europe PMC");
      })(),
    );
  if (c.doi)
    tasks.push(
      (async () => {
        const doi = citationIdentifier({ ...c, pmid: undefined });
        // Query incoming updates: fetching only the original DOI misses separately registered notices.
        const data = await json(
          `https://api.crossref.org/works?filter=${encodeURIComponent(`updates:${doi}`)}&rows=50`,
        );
        for (const record of data.message?.items || [])
          notices.push(...crossrefNotices(record, doi));
        if ((data.message?.["total-results"] ?? Infinity) > 50) throw Error("Truncated updates");
        providers.push("Crossref incoming updates");
      })(),
    );
  const results = await Promise.allSettled(tasks);
  const complete = tasks.length > 0 && results.every((r) => r.status === "fulfilled");
  if (!providers.length && cached?.identifier === identifier) return { ...cached, cached: true };
  if (
    !complete &&
    cached?.identifier === identifier &&
    ["retracted", "concern", "corrected", "notice"].includes(cached.status)
  ) {
    // Partial connectivity must never erase a previously observed adverse notice.
    notices.push(...cached.notices);
  }
  const check: PublicationCheck = {
    identifier,
    checkedAt: Date.now(),
    status: noticeStatus(notices, complete),
    providers,
    notices: notices.slice(0, 50),
    complete,
  };
  try {
    if (identifier && providers.length) await writeLocalRecord(key, JSON.stringify(check));
  } catch {
    /* result remains visible */
  }
  return check;
}
