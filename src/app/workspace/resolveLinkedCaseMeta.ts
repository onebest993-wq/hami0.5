function safeStr(v: unknown): string {
    return typeof v === 'string' ? v.trim() : '';
}

export type LinkedCaseLookupIndex = {
    lawsuitById: Map<string, Record<string, unknown>>;
    executionById: Map<string, Record<string, unknown>>;
};

/** يبني Maps قابلة للإعادة الاستخدام — O(L + E) مرة واحدة. */
export function buildLinkedCaseLookup(
    lawsuitFiles: unknown[],
    executionFiles: unknown[],
): LinkedCaseLookupIndex {
    const lawsuitById = new Map<string, Record<string, unknown>>();
    const executionById = new Map<string, Record<string, unknown>>();
    for (const raw of lawsuitFiles) {
        if (!raw || typeof raw !== 'object') continue;
        const f = raw as Record<string, unknown>;
        const id = safeStr(String(f.id ?? ''));
        if (!id) continue;
        if (!lawsuitById.has(id)) lawsuitById.set(id, f);
    }
    for (const raw of executionFiles) {
        if (!raw || typeof raw !== 'object') continue;
        const f = raw as Record<string, unknown>;
        const id = safeStr(String(f.id ?? ''));
        if (!id) continue;
        if (!executionById.has(id)) executionById.set(id, f);
    }
    return { lawsuitById, executionById };
}

/**
 * نسخة O(1) lookup عبر Map. تستخدمها مسارات الـ batched (buildClusterScanIndex).
 */
export function resolveLinkedCaseMetaFromIndex(
    linkedId: string | null | undefined,
    index: LinkedCaseLookupIndex,
): { caseNumber: string; clientName: string } {
    const id = safeStr(String(linkedId ?? ''));
    if (!id) return { caseNumber: '', clientName: '' };

    const lawsuit = index.lawsuitById.get(id);
    if (lawsuit) {
        const parties = Array.isArray(lawsuit.parties) ? lawsuit.parties : [];
        const clientParty = parties.find(
            (p) => p && typeof p === 'object' && (p as Record<string, unknown>).isClient,
        );
        const clientName =
            clientParty && typeof clientParty === 'object'
                ? safeStr((clientParty as Record<string, unknown>).name)
                : '';
        const caseNumber =
            safeStr(lawsuit.caseNo) || safeStr(lawsuit.caseNumber) || safeStr(lawsuit.fileNumber);
        return { caseNumber, clientName };
    }

    const execution = index.executionById.get(id);
    if (execution) {
        return {
            caseNumber: safeStr(execution.caseNo) || safeStr(execution.fileNumber) || safeStr(execution.caseNumber),
            clientName: safeStr(execution.creditor) || safeStr(execution.clientName),
        };
    }

    return { caseNumber: '', clientName: '' };
}

/** قراءة فقط — استخراج رقم القضية/الموكل من إضبارة مرتبطة بالمعرّف.
 *  نسخة الـ public القديمة (O(L + E) لكل استدعاء). الكود الجديد يستخدم
 *  resolveLinkedCaseMetaFromIndex مع Map للأداء الأفضل في الـ batched paths. */
export function resolveLinkedCaseMeta(
    linkedId: string | null | undefined,
    lawsuitFiles: unknown[],
    executionFiles: unknown[],
): { caseNumber: string; clientName: string } {
    const index = buildLinkedCaseLookup(lawsuitFiles, executionFiles);
    return resolveLinkedCaseMetaFromIndex(linkedId, index);
}
