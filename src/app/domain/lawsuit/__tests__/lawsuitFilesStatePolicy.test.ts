import { describe, expect, it } from 'vitest';
import type { FileData } from '../lawsuitFileTypes';
import { emptyLawsuitFileSegments } from '../lawsuitFileSegments';
import {
    applyLawsuitDurabilityOverlaysToSegments,
    bootHasLawsuitRecords,
    pickRicherLawsuitSegments,
    shouldBlockEmptyLawsuitPersist,
} from '../lawsuitFilesStatePolicy';
import { stagePendingLawsuitCreate, clearLawsuitPendingCreatesForTests } from '../lawsuitPendingCreateStore';
import { resetLawsuitPageWriteGuardForTests } from '../lawsuitPageWriteGuard';

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

    it('pickRicherLawsuitSegments يحتفظ بالأطول من الجانبين', () => {
        const prev = { ...emptyLawsuitFileSegments(), active: [file(1), file(2)] };
        const boot = { ...emptyLawsuitFileSegments(), active: [file(2)] };
        const picked = pickRicherLawsuitSegments(prev, boot);
        expect(picked.active.map((f) => Number(f.id)).sort((a, b) => a - b)).toEqual([1, 2]);
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
