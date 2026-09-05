import { beforeEach, describe, expect, it } from 'vitest';
import type { FileData } from '../lawsuitFileTypes';
import { emptyLawsuitFileSegments } from '../lawsuitFileSegments';
import {
    applyLawsuitDurabilityOverlaysToSegments,
    adoptHydratedLawsuitActive,
    bootHasLawsuitRecords,
    collectHeldOutOfActiveIds,
    pickRicherLawsuitSegments,
    shouldBlockEmptyLawsuitPersist,
} from '../lawsuitFilesStatePolicy';
import { stagePendingLawsuitCreate, clearLawsuitPendingCreatesForTests } from '../lawsuitPendingCreateStore';
import { resetLawsuitPageWriteGuardForTests } from '../lawsuitPageWriteGuard';
import SecureStoreService from '@/app/services/SecureStoreService';
import { LAWSUIT_DOSSIER_TOMBSTONES_KEY } from '@/app/utils/lawsuitDossierTombstones';

const file = (id: number): FileData =>
    ({
        id,
        type: 'lawsuit',
        status: 'active',
        caseNo: `n/${id}`,
        court: 'مدني',
        parties: [],
        history: [],
        notes: [],
        images: [],
        date: '2026-01-01',
    }) as FileData;

describe('lawsuitFilesStatePolicy', () => {
    beforeEach(() => {
        clearLawsuitPendingCreatesForTests();
        resetLawsuitPageWriteGuardForTests();
        try {
            SecureStoreService.deleteItemSync(LAWSUIT_DOSSIER_TOMBSTONES_KEY);
        } catch {
            /* ignore */
        }
        localStorage.removeItem(LAWSUIT_DOSSIER_TOMBSTONES_KEY);
    });
    it('bootHasLawsuitRecords يقرأ النشط أو عدّاد الفهرس', () => {
        expect(bootHasLawsuitRecords(emptyLawsuitFileSegments())).toBe(false);
        expect(
            bootHasLawsuitRecords({
                ...emptyLawsuitFileSegments(),
                active: [file(1)],
            }),
        ).toBe(true);
        expect(
            bootHasLawsuitRecords({
                ...emptyLawsuitFileSegments(),
                index: {
                    v: 1,
                    entries: {},
                    counts: { active: 0, archived: 2, trash: 0 },
                },
            }),
        ).toBe(true);
    });

    it('shouldBlockEmptyLawsuitPersist يسمح بقائمة نشطة غير فارغة', () => {
        expect(
            shouldBlockEmptyLawsuitPersist({
                ...emptyLawsuitFileSegments(),
                active: [file(1)],
            }),
        ).toBe(false);
    });

    it('pickRicher لا يفضّل prev.active إن قال فهرس الإقلاع deleted', () => {
        const prev = {
            ...emptyLawsuitFileSegments(),
            active: [file(1)],
        };
        const boot = {
            ...emptyLawsuitFileSegments(),
            active: [],
            trash: null,
            index: {
                v: 1 as const,
                entries: {
                    '1': { id: '1', status: 'deleted' as const, updatedAt: 1 },
                },
                counts: { active: 0, archived: 0, trash: 1 },
            },
        };
        const picked = pickRicherLawsuitSegments(prev, boot);
        expect(picked.active).toEqual([]);
    });

    it('adoptHydratedLawsuitActive يستبعد معرّف السلة من قائمة hydrate', () => {
        const trashed = { ...file(1), status: 'deleted' as const, deletedAt: 1 };
        const boot = {
            ...emptyLawsuitFileSegments(),
            active: [],
            trash: [trashed],
            index: {
                v: 1 as const,
                entries: {
                    '1': { id: '1', status: 'deleted' as const, updatedAt: 1 },
                },
                counts: { active: 0, archived: 0, trash: 1 },
            },
        };
        const adopted = adoptHydratedLawsuitActive(boot, [file(1), file(2)]);
        expect(adopted.active.map((f) => Number(f.id))).toEqual([2]);
    });

    it('pickRicherLawsuitSegments يحتفظ بالأطول من الجانبين', () => {
        const prev = { ...emptyLawsuitFileSegments(), active: [file(1), file(2)] };
        const boot = { ...emptyLawsuitFileSegments(), active: [file(2)] };
        const picked = pickRicherLawsuitSegments(prev, boot);
        expect(picked.active.map((f) => Number(f.id)).sort((a, b) => a - b)).toEqual([1, 2]);
    });

    it('pickRicher لا يعيد للنشط معرّفاً في سلة prev أو boot', () => {
        const trashed = { ...file(1), status: 'deleted' as const, deletedAt: Date.now() };
        const prev = {
            ...emptyLawsuitFileSegments(),
            active: [file(2)],
            trash: [trashed],
            index: {
                v: 1 as const,
                entries: {
                    '1': { status: 'deleted' as const, updatedAt: 1 },
                    '2': { status: 'active' as const, updatedAt: 1 },
                },
                counts: { active: 1, archived: 0, trash: 1 },
            },
        };
        const boot = {
            ...emptyLawsuitFileSegments(),
            active: [file(1), file(2)],
            trash: null,
        };
        const picked = pickRicherLawsuitSegments(prev, boot);
        expect(picked.active.map((f) => Number(f.id))).toEqual([2]);
    });

    it('pickRicher لا يعيد للنشط معرّفاً مؤرشفاً', () => {
        const archived = { ...file(3), status: 'archived' as const };
        const prev = {
            ...emptyLawsuitFileSegments(),
            active: [file(2)],
            archived: [archived],
            index: {
                v: 1 as const,
                entries: {
                    '3': { status: 'archived' as const, updatedAt: 1 },
                    '2': { status: 'active' as const, updatedAt: 1 },
                },
                counts: { active: 1, archived: 1, trash: 0 },
            },
        };
        const boot = {
            ...emptyLawsuitFileSegments(),
            active: [file(2), file(3)],
            archived: null,
        };
        const picked = pickRicherLawsuitSegments(prev, boot);
        expect(picked.active.map((f) => Number(f.id))).toEqual([2]);
    });

    it('فهرس deleted وحده لا يمسح إضبارة ما زالت في النشط (لا سلة/tombstone)', () => {
        const prev = {
            ...emptyLawsuitFileSegments(),
            active: [file(1), file(2)],
            trash: null,
            index: {
                v: 1 as const,
                entries: {
                    '1': { status: 'deleted' as const, updatedAt: 1 },
                    '2': { status: 'active' as const, updatedAt: 1 },
                },
                counts: { active: 1, archived: 0, trash: 1 },
            },
        };
        const boot = {
            ...emptyLawsuitFileSegments(),
            active: [file(1), file(2)],
            trash: null,
            index: prev.index,
        };
        const picked = pickRicherLawsuitSegments(prev, boot);
        expect(picked.active.map((f) => Number(f.id)).sort((a, b) => a - b)).toEqual([1, 2]);
    });

    it('تكرار نشط+سلة يفضّل النشط ولا يفرّغ المخزن', () => {
        const dup = file(1);
        const trashedDup = { ...file(1), status: 'deleted' as const, deletedAt: 1 };
        const prev = {
            ...emptyLawsuitFileSegments(),
            active: [dup, file(2)],
            trash: [trashedDup],
        };
        const boot = {
            ...emptyLawsuitFileSegments(),
            active: [dup, file(2)],
            trash: [trashedDup],
        };
        const picked = pickRicherLawsuitSegments(prev, boot);
        expect(picked.active.map((f) => Number(f.id)).sort((a, b) => a - b)).toEqual([1, 2]);
        expect(picked.trash?.map((f) => Number(f.id)) ?? []).toEqual([]);
    });

    it('tombstone فاسد لا يُخرج إضبارة ما زالت في النشط', async () => {
        const { markLawsuitDossierTombstone } = await import(
            '@/app/utils/lawsuitDossierTombstones'
        );
        markLawsuitDossierTombstone(1);
        const held = collectHeldOutOfActiveIds({
            trash: [],
            archived: [],
            preferActiveIds: [file(1), file(2)],
            includeTombstones: true,
        });
        expect(held.has('1')).toBe(false);
        expect(held.has('2')).toBe(false);
    });

    it('collectHeldOutOfActiveIds لا يُخرج نشطاً بسبب تكرار سلة أو أرشيف', () => {
        const active = [file(1), file(2)];
        const trash = [
            { ...file(1), status: 'deleted' as const, deletedAt: 1 },
            { ...file(9), status: 'deleted' as const, deletedAt: 1 },
        ];
        const archived = [
            { ...file(2), status: 'archived' as const },
            { ...file(8), status: 'archived' as const },
        ];
        const held = collectHeldOutOfActiveIds({
            trash,
            archived,
            preferActiveIds: active,
            includeTombstones: false,
        });
        expect([...held].map(Number).sort((a, b) => a - b)).toEqual([8, 9]);
    });

    it('تكرار نشط+أرشيف يفضّل النشط', () => {
        const dup = file(1);
        const archivedDup = { ...file(1), status: 'archived' as const };
        const prev = {
            ...emptyLawsuitFileSegments(),
            active: [dup, file(2)],
            archived: [archivedDup],
        };
        const boot = {
            ...emptyLawsuitFileSegments(),
            active: [dup, file(2)],
            archived: [archivedDup],
        };
        const picked = pickRicherLawsuitSegments(prev, boot);
        expect(picked.active.map((f) => Number(f.id)).sort((a, b) => a - b)).toEqual([1, 2]);
        expect(picked.archived?.map((f) => Number(f.id)) ?? []).toEqual([]);
    });

    it('pickRicher يحترم تقلّص السلة بعد الحذف النهائي (لا mergeRicher)', () => {
        const trashedA = { ...file(1), status: 'deleted' as const, deletedAt: 1 };
        const trashedB = { ...file(2), status: 'deleted' as const, deletedAt: 1 };
        const prev = {
            ...emptyLawsuitFileSegments(),
            active: [file(3)],
            trash: [trashedA],
            index: {
                v: 1 as const,
                entries: {
                    '1': { status: 'deleted' as const, updatedAt: 1 },
                    '3': { status: 'active' as const, updatedAt: 1 },
                },
                counts: { active: 1, archived: 0, trash: 1 },
            },
        };
        const boot = {
            ...emptyLawsuitFileSegments(),
            active: [file(3)],
            trash: [trashedA, trashedB],
            index: {
                v: 1 as const,
                entries: {
                    '1': { status: 'deleted' as const, updatedAt: 1 },
                    '2': { status: 'deleted' as const, updatedAt: 1 },
                    '3': { status: 'active' as const, updatedAt: 1 },
                },
                counts: { active: 1, archived: 0, trash: 2 },
            },
        };
        const picked = pickRicherLawsuitSegments(prev, boot);
        expect(picked.trash?.map((f) => Number(f.id))).toEqual([1]);
        expect(picked.active.map((f) => Number(f.id))).toEqual([3]);
    });

    it('pickRicher يستبعد tombstone من السلة ولو كانت أغنى على القرص', async () => {
        const { markLawsuitDossierTombstone } = await import(
            '@/app/utils/lawsuitDossierTombstones'
        );
        markLawsuitDossierTombstone(7);
        const trashed = { ...file(7), status: 'deleted' as const, deletedAt: 1 };
        const other = { ...file(8), status: 'deleted' as const, deletedAt: 1 };
        const prev = {
            ...emptyLawsuitFileSegments(),
            active: [file(1)],
            trash: [trashed, other],
        };
        const boot = {
            ...emptyLawsuitFileSegments(),
            active: [file(1)],
            trash: [trashed, other],
        };
        const picked = pickRicherLawsuitSegments(prev, boot);
        expect(picked.trash?.map((f) => Number(f.id))).toEqual([8]);
    });

    it('applyLawsuitDurabilityOverlaysToSegments يحقن المعلّق فوق الإقلاع', () => {
        clearLawsuitPendingCreatesForTests();
        resetLawsuitPageWriteGuardForTests();
        stagePendingLawsuitCreate(file(9));
        const next = applyLawsuitDurabilityOverlaysToSegments({
            ...emptyLawsuitFileSegments(),
            active: [file(1)],
        });
        expect(next.active.map((f) => Number(f.id)).sort((a, b) => a - b)).toEqual([1, 9]);
        clearLawsuitPendingCreatesForTests();
    });
});
