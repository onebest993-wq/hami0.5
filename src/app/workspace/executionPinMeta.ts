import { extractCaseRefsFromText } from './extractCaseRefs';
import {
    buildLinkedCaseLookup,
    resolveLinkedCaseMetaFromIndex,
    type LinkedCaseLookupIndex,
} from './resolveLinkedCaseMeta';
import { isLikelyCaseReference, sanitizePinCaseNumber } from './pinDisplayUtils';

function safeStr(v: unknown): string {
    return typeof v === 'string' ? v.trim() : '';
}

function partyName(p: unknown): string {
    if (!p || typeof p !== 'object') return '';
    return safeStr((p as { name?: string }).name);
}

function partiesFromArray(arr: unknown, preferClient: boolean): string {
    if (!Array.isArray(arr)) return '';
    if (preferClient) {
        const clientRow = arr.find((p) => p && typeof p === 'object' && (p as { isClient?: boolean }).isClient);
        const fromClient = partyName(clientRow);
        if (fromClient) return fromClient;
    }
    for (const p of arr) {
        const n = partyName(p);
        if (n) return n;
    }
    return '';
}

/** موكل الإضبارة التنفيذية — من creditors/debtors حسب representedParty */
export function extractExecutionClientName(f: Record<string, unknown>): string {
    const represented = safeStr(f.representedParty);
    const creditors = Array.isArray(f.creditors) ? f.creditors : [];
    const debtors = Array.isArray(f.debtors) ? f.debtors : [];
    const pool = represented === 'debtor' ? debtors : creditors;
    const fromPool = partiesFromArray(pool, true);
    if (fromPool) return fromPool;

    const credObj = f.creditor;
    if (credObj && typeof credObj === 'object') {
        const n = partyName(credObj);
        if (n) return n;
    }
    const debObj = f.debtor;
    if (debObj && typeof debObj === 'object') {
        const n = partyName(debObj);
        if (n) return n;
    }

    return safeStr(f.creditor) || safeStr(f.clientName) || partiesFromArray(debtors, false);
}

export function extractExecutionCaseNumber(
    f: Record<string, unknown>,
    lawsuitFiles: unknown[] = [],
    lookupIndex?: LinkedCaseLookupIndex,
): string {
    const fileNo = safeStr(f.fileNumber) || safeStr(f.caseNo);
    const fileYear = safeStr(f.fileYear) || safeStr(f.file_year);
    const fileComposite = fileNo && fileYear ? `${fileNo}/${fileYear}` : fileNo || fileYear;

    // إن لم يُمرَّر index → نبنيه (يحدث في الاستخدامات الفردية).
    // الـ batched paths تُمرّر index موحَّداً → O(1) lookup بدلاً من O(L) لكل استدعاء.
    const idx = lookupIndex ?? buildLinkedCaseLookup(lawsuitFiles, []);

    const parentId = safeStr(f.parentId);
    if (parentId) {
        const linked = resolveLinkedCaseMetaFromIndex(parentId, idx);
        const fromParent = sanitizePinCaseNumber(linked.caseNumber, linked.clientName);
        if (fromParent) return fromParent;
    }

    const linkedDossiers = Array.isArray(f.linkedDossiers) ? f.linkedDossiers : [];
    for (const row of linkedDossiers) {
        if (!row || typeof row !== 'object') continue;
        const lid = safeStr((row as { linkedId?: string }).linkedId);
        if (!lid) continue;
        const meta = resolveLinkedCaseMetaFromIndex(lid, idx);
        const fromLink = sanitizePinCaseNumber(meta.caseNumber, meta.clientName);
        if (fromLink) return fromLink;
        const ln = safeStr((row as { fileNumber?: string }).fileNumber);
        const ly = safeStr((row as { fileYear?: string }).fileYear);
        const composite = ln && ly ? `${ln}/${ly}` : ln;
        if (composite && isLikelyCaseReference(composite)) return composite;
    }

    const direct = sanitizePinCaseNumber(
        safeStr(f.caseNo) || safeStr(f.caseNumber),
        safeStr(f.docNumber),
        safeStr(f.relationship),
        safeStr(f.title),
    );
    if (direct) return direct;

    for (const part of [safeStr(f.docNumber), safeStr(f.relationship)]) {
        const refs = extractCaseRefsFromText(part);
        if (refs[0]) return refs[0];
    }

    return fileComposite && isLikelyCaseReference(fileComposite) ? fileComposite : '';
}
