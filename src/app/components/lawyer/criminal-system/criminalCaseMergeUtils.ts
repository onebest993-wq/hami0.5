/** يقرأ mergedCaseIds مع ترحيل mergedFromCaseIds. */
export function resolveMergedCaseIds(
    caseRecord:
        | {
              mergedCaseIds?: string[];
              mergedFromCaseIds?: string[];
          }
        | undefined,
): string[] {
    if (!caseRecord) return [];
    const raw = [
        ...(Array.isArray(caseRecord.mergedCaseIds) ? caseRecord.mergedCaseIds : []),
        ...(Array.isArray(caseRecord.mergedFromCaseIds) ? caseRecord.mergedFromCaseIds : []),
    ];
    return Array.from(new Set(raw.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0)));
}
