import type { FileData } from '../../LawyerShared';
import { findFileById, normalizeFileId } from './incidentalCaseLinking';
import {
    type ConsolidationCandidate,
    formatLitigationDegreeLabel,
    isConsolidationEligibleFile,
    resolveActiveStageName,
    resolveLitigationDegree,
    resolveLitigationDegreeKey,
} from './caseConsolidationHelpers';

export function listConsolidationCandidates(
    files: FileData[],
    currentFileId: unknown,
): ConsolidationCandidate[] {
    const currentId = normalizeFileId(currentFileId);
    if (currentId === null) return [];

    const currentFile = findFileById(files, currentId);
    if (!currentFile) return [];
    const currentDegreeKey = resolveLitigationDegreeKey(currentFile);

    const seenIds = new Set<number>();
    const candidates: ConsolidationCandidate[] = [];

    for (const f of files) {
        const id = normalizeFileId(f.id);
        if (id === null || id === currentId || seenIds.has(id)) continue;
        if (!isConsolidationEligibleFile(f)) continue;
        if (resolveLitigationDegreeKey(f) !== currentDegreeKey) continue;

        seenIds.add(id);
        const stageLabel = resolveActiveStageName(f) || formatLitigationDegreeLabel(resolveLitigationDegree(resolveActiveStageName(f)));
        const caseNo = String(f.caseNo ?? '').trim() || `#${id}`;
        candidates.push({
            id,
            caseNo,
            status: String(f.status ?? 'active'),
            court: typeof f.court === 'string' ? f.court : undefined,
            clientName: f.parties?.find((p) => p.isClient)?.name?.trim() || undefined,
            stageLabel,
        });
    }

    return candidates.sort((a, b) => {
        const rank = (status: string) => {
            if (status === 'archived' || status === 'archived_stage') return 1;
            if (status === 'paused') return 2;
            return 0;
        };
        const byStatus = rank(a.status) - rank(b.status);
        if (byStatus !== 0) return byStatus;
        return a.caseNo.localeCompare(b.caseNo, 'ar');
    });
}

export function assertDistinctConsolidationPair(
    primaryId: unknown,
    secondaryId: unknown,
): { primary: number; secondary: number } | null {
    const a = normalizeFileId(primaryId);
    const b = normalizeFileId(secondaryId);
    if (a === null || b === null || a === b) return null;
    return { primary: a, secondary: b };
}
