import { loadCriminalCasesCardIndexSync } from '@/app/utils/criminalCasesStorage';
import type { CriminalCaseCardIndexEntry } from '@/app/utils/criminalCaseCardIndex';
import type { CaseLinkCandidate } from './caseLinking';

function readCriminalCaseNo(entry: CriminalCaseCardIndexEntry): string {
    return (
        String(entry.courtCaseNumber ?? '').trim() ||
        String(entry.location?.caseNumber ?? '').trim() ||
        `#${entry.id}`
    );
}

function readCriminalClientName(entry: CriminalCaseCardIndexEntry): string | undefined {
    const client =
        entry.defendants?.find((p) => p.isClient) ??
        entry.complainants?.find((p) => p.isClient) ??
        entry.defendants?.[0] ??
        entry.complainants?.[0];
    const name = String(client?.fullName ?? client?.name ?? '').trim();
    return name || undefined;
}

export function criminalCaseLinkCandidate(entry: CriminalCaseCardIndexEntry): CaseLinkCandidate {
    const caseNo = readCriminalCaseNo(entry);
    return {
        key: `criminal:${entry.id}`,
        id: 0,
        dossierKind: 'criminal',
        criminalId: entry.id,
        caseNo,
        status: entry.isArchived ? 'archived' : 'active',
        court: entry.location?.courtName,
        clientName: readCriminalClientName(entry),
        stageLabel: entry.basics?.stage,
        kindLabel: 'جزائي',
    };
}

export function buildCriminalCaseLinkCandidates(
    linkedCriminalIds: Set<string>,
    currentCriminalId?: string | null,
): CaseLinkCandidate[] {
    const blocked = new Set(linkedCriminalIds);
    const selfId = String(currentCriminalId ?? '').trim();
    if (selfId) blocked.add(selfId);

    return loadCriminalCasesCardIndexSync()
        .filter((entry) => !entry.mergedIntoCaseId && !blocked.has(entry.id))
        .map(criminalCaseLinkCandidate)
        .sort((a, b) => a.caseNo.localeCompare(b.caseNo, 'ar'));
}
