import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_TRASH_KEY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import {
    loadLawsuitBootState,
    migrateLawsuitMonolithicToSegmentsIfNeeded,
    readLawsuitActiveSegment,
    readLawsuitArchivedSegment,
    readLawsuitTrashSegment,
} from '@/app/domain/lawsuit/lawsuitSegmentStorage';
import { loadInitialLawsuitFiles, applyLawsuitTrashSegments } from '@/app/domain/lawsuit/lawsuitFilesRepository';
import { emptyLawsuitFileSegments } from '@/app/domain/lawsuit/lawsuitFilesRepository';

vi.mock('@/app/utils/lawsuitFilesStorage', () => ({
    loadLawsuitFilesRaw: vi.fn(() => []),
    saveLawsuitFilesRawImmediate: vi.fn(),
}));

const file = (id: number, status: FileData['status'] = 'active'): FileData => ({
    id,
    type: 'lawsuit',
    status,
    caseNo: `2026/ب/${id}`,
    court: 'بداءة الكرخ',
    parties: [],
    history: [],
    notes: [],
    images: [],
    date: '2026-01-01',
});

describe('lawsuitSegmentStorage boot', () => {
    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
    });

    it('loadLawsuitBootState returns active only with null lazy segments', () => {
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_ACTIVE_KEY,
            JSON.stringify([file(1), file(2)]),
        );
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_INDEX_KEY,
            JSON.stringify({
                v: 1,
                entries: {},
                counts: { active: 2, archived: 0, trash: 0 },
            }),
        );
        const boot = loadLawsuitBootState();
        expect(boot.active).toHaveLength(2);
        expect(boot.archived).toBeNull();
        expect(boot.trash).toBeNull();
    });

    it('migrate splits monolithic lawyer_files into segments', async () => {
        const { loadLawsuitFilesRaw } = await import('@/app/utils/lawsuitFilesStorage');
        vi.mocked(loadLawsuitFilesRaw).mockReturnValue([
            file(1),
            file(2, 'archived'),
            file(3, 'deleted'),
        ]);
        const boot = migrateLawsuitMonolithicToSegmentsIfNeeded();
        expect(boot.migrated).toBe(true);
        expect(readLawsuitActiveSegment()).toHaveLength(1);
        expect(readLawsuitArchivedSegment()).toHaveLength(1);
        expect(readLawsuitTrashSegment()).toHaveLength(1);
    });

    it('loadInitialLawsuitFiles returns active segment only', () => {
        SecureStoreService.setItemSync(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([file(1)]));
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_ARCHIVED_KEY,
            JSON.stringify([file(2, 'archived')]),
        );
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_INDEX_KEY,
            JSON.stringify({
                v: 1,
                entries: {},
                counts: { active: 1, archived: 1, trash: 0 },
            }),
        );
        expect(loadInitialLawsuitFiles()).toHaveLength(1);
    });

    it('applyLawsuitTrashSegments moves file between segments in memory', () => {
        const segments = {
            ...emptyLawsuitFileSegments(),
            active: [file(1), file(2)],
            trash: [],
            index: {
                v: 1 as const,
                entries: {},
                counts: { active: 2, archived: 0, trash: 0 },
            },
        };
        const next = applyLawsuitTrashSegments(segments, 1);
        expect(next.active).toHaveLength(1);
        expect(next.trash).toHaveLength(1);
        expect(next.index.counts.trash).toBe(1);
        expect(next.index.counts.active).toBe(1);
    });
});
