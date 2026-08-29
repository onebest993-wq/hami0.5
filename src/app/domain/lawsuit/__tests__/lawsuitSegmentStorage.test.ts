import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileData } from '../lawsuitFileTypes';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_TRASH_KEY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import {
    applyLawsuitMonolithicMergeToSegments,
    findLawsuitFileAcrossSegments,
    loadLawsuitBootState,
    migrateLawsuitMonolithicToSegmentsIfNeeded,
    persistLawsuitActiveSegment,
    readLawsuitActiveSegment,
    readLawsuitArchivedSegment,
    readLawsuitTrashSegment,
    resolveLazyLawsuitSegmentForMirror,
    mirrorLawsuitSegmentsSafe,
} from '@/app/domain/lawsuit/lawsuitSegmentStorage';
import { loadInitialLawsuitFiles, applyLawsuitTrashSegments, applyLawsuitConsolidationSegments } from '@/app/domain/lawsuit/lawsuitFilesRepository';
import { emptyLawsuitFileSegments } from '@/app/domain/lawsuit/lawsuitFilesRepository';
import { saveLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { clearLawsuitPendingCreatesForTests } from '@/app/domain/lawsuit/lawsuitPendingCreateStore';

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

describe('lawsuitSegmentStorage boot', () => {
    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        clearLawsuitPendingCreatesForTests();
        try {
            SecureStoreService.deleteItemSync('hami_lawsuit_write_journal_v1');
        } catch {
            /* ignore */
        }
        localStorage.removeItem('hami_lawsuit_write_journal_v1');
        localStorage.removeItem(LAWSUIT_FILES_ACTIVE_KEY);
        localStorage.removeItem(LAWSUIT_FILES_ARCHIVED_KEY);
        localStorage.removeItem(LAWSUIT_FILES_INDEX_KEY);
        localStorage.removeItem(LAWSUIT_FILES_STORAGE_KEY);
        localStorage.removeItem(LAWSUIT_FILES_TRASH_KEY);
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

    it('persistLawsuitActiveSegment يرفض إفراغ النشط بدون allowShrink', () => {
        SecureStoreService.setItemSync(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([file(1), file(2)]));
        persistLawsuitActiveSegment([]);
        const raw = SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY);
        expect(raw).toBeTruthy();
        const parsed = JSON.parse(String(raw)) as unknown[];
        expect(parsed).toHaveLength(2);
    });

    it('persistLawsuitActiveSegment يدمج قائمة جزئية مع القرص الأغنى', () => {
        SecureStoreService.setItemSync(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([file(1), file(2)]));
        persistLawsuitActiveSegment([file(3)]);
        const raw = SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY);
        const parsed = JSON.parse(String(raw)) as Array<{ id: number }>;
        const ids = parsed.map((r) => r.id).sort((a, b) => a - b);
        expect(ids).toEqual([1, 2, 3]);
    });

    it('persistLawsuitActiveSegment يسمح بالإفراغ مع allowShrink', () => {
        SecureStoreService.setItemSync(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([file(1)]));
        persistLawsuitActiveSegment([], { allowShrink: true, allowVerifiedEmpty: true });
        const raw = SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY);
        expect(JSON.parse(String(raw))).toEqual([]);
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

    it('applyLawsuitMonolithicMergeToSegments يرفض الدمج الفارغ فوق بيانات موجودة', () => {
        SecureStoreService.setItemSync(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([file(3)]));
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_INDEX_KEY,
            JSON.stringify({
                v: 1,
                entries: {},
                counts: { active: 1, archived: 0, trash: 0 },
            }),
        );
        const kept = applyLawsuitMonolithicMergeToSegments([]);
        expect(kept.active).toHaveLength(1);
        expect(kept.active[0]?.id).toBe(3);
    });

    it('applyLawsuitMonolithicMergeToSegments لا يمسح إضابات القرص بقائمة سحابة أقصر', () => {
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
        const next = applyLawsuitMonolithicMergeToSegments([file(1), file(9)]);
        const ids = next.active.map((f) => Number(f.id)).sort((a, b) => a - b);
        expect(ids).toEqual([1, 2, 9]);
        expect(readLawsuitActiveSegment().map((f) => Number(f.id)).sort((a, b) => a - b)).toEqual([
            1, 2, 9,
        ]);
    });

    it('applyLawsuitMonolithicMergeToSegments يعيد تقسيم المرآة إلى مقاطع', () => {
        applyLawsuitMonolithicMergeToSegments([
            file(1),
            file(2, 'archived'),
            file(3, 'deleted'),
        ]);
        expect(readLawsuitActiveSegment()).toHaveLength(1);
        expect(readLawsuitArchivedSegment()).toHaveLength(1);
        expect(readLawsuitTrashSegment()).toHaveLength(1);
        expect(saveLawsuitFilesRaw).toHaveBeenCalled();
        expect(findLawsuitFileAcrossSegments(2)?.status).toBe('archived');
        expect(findLawsuitFileAcrossSegments(3)?.status).toBe('deleted');
    });

    it('mirrorLawsuitSegmentsSafe لا يبني مرآة من أرشيف غير مقروء', async () => {
        await SecureStoreService.setItem(
            LAWSUIT_FILES_ARCHIVED_KEY,
            JSON.stringify([file(9, 'archived')]),
        );
        SecureStoreService.setItemSync(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([file(1)]));
        SecureStoreService.clearDecryptedMemoryCache();
        expect(SecureStoreService.isUnreadSync(LAWSUIT_FILES_ARCHIVED_KEY)).toBe(true);

        vi.mocked(saveLawsuitFilesRaw).mockClear();
        mirrorLawsuitSegmentsSafe([file(1)], null, []);
        expect(saveLawsuitFilesRaw).not.toHaveBeenCalled();
    });

    it('resolveLazyLawsuitSegmentForMirror لا يستبدل null بمصفوفة فارغة', () => {
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_ARCHIVED_KEY,
            JSON.stringify([file(9, 'archived')]),
        );
        const resolved = resolveLazyLawsuitSegmentForMirror(null, readLawsuitArchivedSegment);
        expect(resolved).toHaveLength(1);
        expect(resolved[0]?.id).toBe(9);
    });

    it('applyLawsuitTrashSegments مع trash=null لا يمسح المهملات على القرص', () => {
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_TRASH_KEY,
            JSON.stringify([file(90, 'deleted')]),
        );
        const segments = {
            ...emptyLawsuitFileSegments(),
            active: [file(1), file(2)],
            trash: null,
            index: {
                v: 1 as const,
                entries: {},
                counts: { active: 2, archived: 0, trash: 1 },
            },
        };
        const next = applyLawsuitTrashSegments(segments, 1);
        expect(next.trash).toHaveLength(2);
        expect(next.trash?.map((f) => f.id).sort()).toEqual([1, 90]);
        expect(readLawsuitTrashSegment()).toHaveLength(2);
        expect(readLawsuitTrashSegment().map((f) => f.id).sort()).toEqual([1, 90]);
    });

    it('applyLawsuitConsolidationSegments يضع الثانوية في archived لا active', () => {
        SecureStoreService.setItemSync(
            LAWSUIT_FILES_ARCHIVED_KEY,
            JSON.stringify([file(9, 'archived')]),
        );
        const primary = file(1);
        const secondary = { ...file(2), status: 'archived' as const };
        const segments = {
            ...emptyLawsuitFileSegments(),
            active: [primary, file(2)],
            archived: null,
            trash: null,
            index: {
                v: 1 as const,
                entries: {},
                counts: { active: 2, archived: 1, trash: 0 },
            },
        };
        const next = applyLawsuitConsolidationSegments(segments, primary, secondary);
        expect(next.active.map((f) => f.id)).toEqual([1]);
        expect(next.active.every((f) => f.status !== 'archived')).toBe(true);
        expect(next.archived?.map((f) => f.id).sort()).toEqual([2, 9]);
        expect(readLawsuitArchivedSegment().map((f) => f.id).sort()).toEqual([2, 9]);
        expect(readLawsuitActiveSegment().map((f) => f.id)).toEqual([1]);
    });

    it('يرحّل leftover المقطع النشط ويمحوه', () => {
        localStorage.setItem(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([file(77)]));
        expect(readLawsuitActiveSegment().some((f) => String(f.id) === '77')).toBe(true);
        expect(localStorage.getItem(LAWSUIT_FILES_ACTIVE_KEY)).toBeNull();
        expect(SecureStoreService.getItemSync(LAWSUIT_FILES_ACTIVE_KEY)).toContain('"id":77');
    });

    it('لا يسمّ leftover فوق أصل unread', () => {
        SecureStoreService.setItemSync(LAWSUIT_FILES_ACTIVE_KEY, 'hami_enc_v2:lawsuit-cold');
        SecureStoreService.clearDecryptedMemoryCache();
        localStorage.setItem(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([file(1)]));
        expect(readLawsuitActiveSegment()).toEqual([]);
        expect(localStorage.getItem(LAWSUIT_FILES_ACTIVE_KEY)).not.toBeNull();
    });

    it('بعد كتابة المقطع تُمحى مرآة localStorage', () => {
        localStorage.setItem(LAWSUIT_FILES_ACTIVE_KEY, JSON.stringify([file(9)]));
        persistLawsuitActiveSegment([file(3)]);
        expect(localStorage.getItem(LAWSUIT_FILES_ACTIVE_KEY)).toBeNull();
        expect(readLawsuitActiveSegment().some((f) => Number(f.id) === 3)).toBe(true);
    });
});
