import { describe, expect, it } from 'vitest';
import type { WorkCloudCheckpointPayload } from '@/app/services/cloud/workCloudCheckpoint';
import {
    carryForwardOmittedSlices,
    composeRestorePayload,
    resolveCalendarFromHistory,
    stripCalendarFromCheckpoint,
} from '@/app/services/cloud/workCloudCheckpointHistory';

function payload(
    overrides: Partial<WorkCloudCheckpointPayload> = {},
): WorkCloudCheckpointPayload {
    return {
        v: 1,
        savedAt: '2026-08-01T00:00:00.000Z',
        lawsuits: [],
        execution: [],
        notes: [],
        calendar: [],
        calendarTombstones: {},
        calendarOmittedForBudget: false,
        calendarSlicePresent: true,
        ...overrides,
    };
}

describe('workCloudCheckpointHistory', () => {
    it('يُرحّل شريحة السلة المطفأة فقط', () => {
        const merged = carryForwardOmittedSlices(
            payload({ lawsuits: [], execution: [{ id: 'ex-new' }], notes: [] }),
            payload({ lawsuits: [{ id: 'ls-prev' }], execution: [{ id: 'ex-old' }], notes: [{ id: 'n-old' }] }),
            { lawsuits: true, execution: false, notes: true },
        );
        expect(merged.lawsuits).toEqual([{ id: 'ls-prev' }]);
        expect(merged.execution).toEqual([{ id: 'ex-new' }]);
        expect(merged.notes).toEqual([{ id: 'n-old' }]);
    });

    it('إسقاط التقويم لفيض الحجم يضع علماً لا يُفقد الشريحة على الاستعادة', () => {
        const stripped = stripCalendarFromCheckpoint(
            payload({
                lawsuits: [{ id: 'ls-1' }],
                calendar: [{ id: 'ev-1' }],
                calendarTombstones: { u1: [{ eventId: 'gone' }] },
            }),
        );
        expect(stripped.calendar).toEqual([]);
        expect(stripped.calendarTombstones).toEqual({});
        expect(stripped.calendarOmittedForBudget).toBe(true);
        expect(stripped.lawsuits).toEqual([{ id: 'ls-1' }]);
    });

    it('استعادة من نقطة أسقطت التقويم تأخذ المواعيد من الصف الأقدم', () => {
        const restored = composeRestorePayload([
            payload({
                lawsuits: [{ id: 'ls-new' }],
                calendarOmittedForBudget: true,
            }),
            payload({
                lawsuits: [{ id: 'ls-old' }],
                calendar: [{ id: 'ev-keep' }],
                calendarTombstones: { u1: [{ eventId: 'gone' }] },
            }),
        ]);
        expect(restored?.lawsuits).toEqual([{ id: 'ls-new' }]);
        expect(restored?.calendar).toEqual([{ id: 'ev-keep' }]);
        expect(restored?.calendarTombstones).toEqual({ u1: [{ eventId: 'gone' }] });
        expect(restored?.calendarOmittedForBudget).toBe(false);
    });

    it('بناء قديم بلا حقل تقويم لا يُفرّغ شريحة أحدث سابقة', () => {
        const restored = composeRestorePayload([
            payload({
                lawsuits: [{ id: 'ls-old-build' }],
                calendarSlicePresent: false,
                calendarOmittedForBudget: false,
            }),
            payload({
                lawsuits: [{ id: 'ls-newer-client' }],
                calendar: [{ id: 'ev-keep' }],
                calendarSlicePresent: true,
            }),
        ]);
        expect(restored?.lawsuits).toEqual([{ id: 'ls-old-build' }]);
        expect(restored?.calendar).toEqual([{ id: 'ev-keep' }]);
    });

    it('تفريغ تقويم متعمّد (شريحة حاضرة بلا علم فيض) لا يسحب مواعيد قديمة', () => {
        const cal = resolveCalendarFromHistory([
            payload({ calendarSlicePresent: true, calendar: [], calendarTombstones: {} }),
            payload({ calendar: [{ id: 'ev-old' }], calendarSlicePresent: true }),
        ]);
        expect(cal.calendar).toEqual([]);
    });
});
