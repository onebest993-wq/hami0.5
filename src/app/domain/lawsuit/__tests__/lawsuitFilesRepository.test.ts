import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { FileData } from '../lawsuitFileTypes';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_TRASH_KEY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import {
    applyLawsuitArchiveSegments,
    applyLawsuitPermanentDeleteSegments,
    applyLawsuitRestoreFromTrashSegments,
    applyLawsuitTrashSegments,
    emptyLawsuitFileSegments,
    loadInitialLawsuitFilesAsync,
    stripStaleMockLawsuitFile,
} from '@/app/domain/lawsuit/lawsuitFilesRepository';

vi.mock('@/app/utils/lawsuitFilesStorage', () => ({
    loadLawsuitFilesRaw: vi.fn(() => []),
    saveLawsuitFilesRaw: vi.fn(),
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

describe('lawsuitFilesRepository segments', () => {
    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
    });

    it('stripStaleMockLawsuitFile removes known mock', () => {
        const mock = [{ ...file(1), caseNo: '2025/ب/522' }];
        expect(stripStaleMockLawsuitFile(mock)).toEqual([]);
        expect(stripStaleMockLawsuitFile([file(2)])).toHaveLength(1);
    });

    it('loadInitialLawsuitFilesAsync يسخّن المفاتيح ثم يعيد النشطة', async () => {
        const ready = vi
            .spyOn(SecureStoreService, 'ensureLawsuitKeysReady')
            .mockResolvedValue(undefined);
        SecureStoreService.setItemSync(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([file(4)]));
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_INDEX_KEY,
            JSON.stringify({
                v: 1,
                entries: {},
                counts: { active: 1, archived: 0, trash: 0 },
            }),
        );
        const loaded = await loadInitialLawsuitFilesAsync();
        expect(ready).toHaveBeenCalled();
        expect(loaded).toHaveLength(1);
        expect(loaded[0]?.id).toBe(4);
        ready.mockRestore();
    });

    it('applyLawsuitTrashSegments ينقل إلى مقطع trash', () => {
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
        expect(next.trash?.[0]?.status).toBe('deleted');
        expect(next.trash?.[0]?.deletedAt).toEqual(expect.any(Number));
        expect(SecureStoreService.getItemSync(LAWSUIT_FILES_TRASH_KEY)).toBeTruthy();
        expect(SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY)).toBeTruthy();
    });

    it('applyLawsuitRestoreFromTrashSegments يعيد إلى active', () => {
        const trashed = { ...file(1), status: 'deleted' as const, deletedAt: Date.now() };
        const segments = {
            ...emptyLawsuitFileSegments(),
            active: [],
            trash: [trashed],
            index: {
                v: 1 as const,
                entries: {},
                counts: { active: 0, archived: 0, trash: 1 },
            },
        };
        const next = applyLawsuitRestoreFromTrashSegments(segments, 1);
        expect(next.active).toHaveLength(1);
        expect(next.active[0]?.status).toBe('active');
        expect(next.trash).toHaveLength(0);
    });

    it('applyLawsuitArchiveSegments ثم permanent delete من trash', () => {
        const active = {
            ...emptyLawsuitFileSegments(),
            active: [file(1), file(2)],
            archived: [],
            trash: [],
            index: {
                v: 1 as const,
                entries: {},
                counts: { active: 2, archived: 0, trash: 0 },
            },
        };
        const archived = applyLawsuitArchiveSegments(active, 1);
        expect(archived.archived).toHaveLength(1);
        expect(SecureStoreService.getItemSync(LAWSUIT_FILES_ARCHIVED_KEY)).toBeTruthy();

        const withTrash = applyLawsuitTrashSegments(
            { ...archived, trash: [] },
            2,
        );
        const remaining = applyLawsuitPermanentDeleteSegments(withTrash, [2]);
        expect(remaining.trash).toHaveLength(0);
        expect(remaining.active.some((f) => f.id === 2)).toBe(false);
        expect(SecureStoreService.getItemSync(LAWSUIT_FILES_INDEX_KEY)).toBeTruthy();
    });
});

describe('mirrorLawsuitSegmentsSafe (B2)', () => {
    it('is shared from lawsuitSegmentPersist — re-exported by storage, no private duplicates', () => {
        const root = path.join(process.cwd(), 'src/app/domain/lawsuit');
        const persist = fs.readFileSync(path.join(root, 'lawsuitSegmentPersist.ts'), 'utf8');
        const storage = fs.readFileSync(path.join(root, 'lawsuitSegmentStorage.ts'), 'utf8');
        const repo = fs.readFileSync(path.join(root, 'lawsuitFilesRepository.ts'), 'utf8');
        const mut = fs.readFileSync(path.join(root, 'lawsuitFilesSegmentMutations.ts'), 'utf8');
        expect(persist).toContain('export function mirrorLawsuitSegmentsSafe');
        expect(storage).toContain('mirrorLawsuitSegmentsSafe');
        expect(repo).toContain('persistLawsuitActiveBundle');
        expect(mut).toContain('persistLawsuitLifecycleMirrorBundle');
        expect(repo).not.toContain('function mirrorSegmentsSafe');
        expect(mut).not.toContain('function mirrorSegmentsSafe');
    });
});
