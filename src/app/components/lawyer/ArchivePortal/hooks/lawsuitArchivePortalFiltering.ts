import type { FileData } from '@/app/components/lawyer/LawyerShared';
import {
    filterByLawsuitJurisdictionTab,
    type LawsuitJurisdictionSource,
    type LawsuitJurisdictionTab,
} from '@/app/domain/lawsuit/lawsuitJurisdiction';
import { criminalSearchHaystack } from '../criminalArchiveUtils';
import type { LooseArchiveFile } from '../types';
import type { LawsuitViewMode } from './lawsuitLifecycleTypes';

export function resolveLawsuitLifecycleSourceFiles(
    lawsuitViewMode: LawsuitViewMode,
    files: FileData[],
    lawsuitArchivedFiles: FileData[] | null | undefined,
    lawsuitTrashFiles: FileData[] | null | undefined,
): FileData[] {
    if (lawsuitViewMode === 'trash') return lawsuitTrashFiles ?? [];
    if (lawsuitViewMode === 'archived') return lawsuitArchivedFiles ?? [];
    return files;
}

export function filterLawsuitArchiveFiles(
    lifecycleSourceFiles: FileData[],
    lawsuitJurisdictionTab: LawsuitJurisdictionTab,
    searchQuery: string,
): FileData[] {
    let filtered: FileData[] = lifecycleSourceFiles;
    if (lawsuitJurisdictionTab === 'criminal') {
        filtered = [];
    } else if (lawsuitJurisdictionTab !== 'all') {
        filtered = filterByLawsuitJurisdictionTab(
            filtered as LawsuitJurisdictionSource[],
            lawsuitJurisdictionTab,
        ) as FileData[];
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((f) => {
        const row = f as LooseArchiveFile;
        const parties = Array.isArray(row.parties) ? row.parties : [];
        const partyNames = parties
            .map((p) =>
                p && typeof p === 'object' && 'name' in p ? String((p as { name?: string }).name) : '',
            )
            .join(' ');
        const hay = [row.caseNo, row.caseNumber, row.title, row.docType, row.court, partyNames]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        return hay.includes(q);
    });
}

export function filterLawsuitCriminalCases(
    criminalCases: unknown[] | undefined,
    lawsuitViewMode: LawsuitViewMode,
    lawsuitJurisdictionTab: LawsuitJurisdictionTab,
    searchQuery: string,
    criminalCardsReady: boolean,
): Record<string, unknown>[] {
    if (!criminalCardsReady && lawsuitJurisdictionTab !== 'criminal') return [];
    if (
        lawsuitViewMode === 'active' &&
        lawsuitJurisdictionTab !== 'criminal' &&
        lawsuitJurisdictionTab !== 'all'
    ) {
        return [];
    }
    if (lawsuitViewMode === 'trash') return [];

    let list = (Array.isArray(criminalCases) ? criminalCases : []).filter((raw) => {
        if (!raw || typeof raw !== 'object') return false;
        const c = raw as Record<string, unknown>;
        const mergedInto = String(c.mergedIntoCaseId ?? '').trim();
        const archived = Boolean(c.isArchived) || Boolean(mergedInto);
        if (lawsuitViewMode === 'archived') return archived;
        return !archived;
    }) as Record<string, unknown>[];

    const q = searchQuery.trim().toLowerCase();
    if (q) {
        list = list.filter((c) => criminalSearchHaystack(c).includes(q));
    }

    list.sort((a, b) => {
        const at = typeof a.createdAt === 'string' ? Date.parse(a.createdAt) : 0;
        const bt = typeof b.createdAt === 'string' ? Date.parse(b.createdAt) : 0;
        return bt - at;
    });
    return list;
}

export function countCriminalArchivedCases(
    criminalCases: unknown[] | undefined,
    criminalCardsReady: boolean,
    lawsuitJurisdictionTab: LawsuitJurisdictionTab,
): number {
    if (!criminalCardsReady && lawsuitJurisdictionTab !== 'criminal') return 0;
    return (Array.isArray(criminalCases) ? criminalCases : []).filter((raw) => {
        if (!raw || typeof raw !== 'object') return false;
        const c = raw as Record<string, unknown>;
        const mergedInto = String(c.mergedIntoCaseId ?? '').trim();
        return Boolean(c.isArchived) || Boolean(mergedInto);
    }).length;
}
