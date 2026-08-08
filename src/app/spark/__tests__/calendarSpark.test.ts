import { describe, expect, it } from 'vitest';
import { buildCalendarSparkContext } from '@/app/spark/context/calendarSparkContext';
import { pickActiveCalendarSparkNudge } from '@/app/spark/engine/sparkCalendarEngine';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

function makeEvent(partial: Partial<UnifiedEvent> & Pick<UnifiedEvent, 'id' | 'title' | 'date'>): UnifiedEvent {
    return {
        type: 'hearing',
        source: 'hearing',
        ...partial,
    };
}

describe('calendar spark', () => {
    const nowMs = Date.parse('2026-08-05T10:00:00');

    it('يكتشف جلسة قريبة بلا ربط برقم قضية', () => {
        const events: UnifiedEvent[] = [
            makeEvent({
                id: 'ev-1',
                title: 'جلسة مرافعة',
                date: '2026-08-06',
                time: '11:00',
            }),
        ];

        const ctx = buildCalendarSparkContext(events, { nowMs, horizonHours: 48 });
        const nudge = pickActiveCalendarSparkNudge(ctx);

        expect(nudge?.kind).toBe('calendar.hearing_prep_gap');
        expect(nudge?.targetFileId).toBe('ev-1');
    });

    it('يكتشف جلسة قريبة بلا محكمة أو مكان', () => {
        const events: UnifiedEvent[] = [
            makeEvent({
                id: 'ev-2',
                title: 'جلسة استماع',
                date: '2026-08-06',
                time: '09:00',
                caseNo: '55/2026',
            }),
        ];

        const ctx = buildCalendarSparkContext(events, { nowMs, horizonHours: 48 });
        const nudge = pickActiveCalendarSparkNudge(ctx);

        expect(nudge?.kind).toBe('calendar.hearing_missing_court');
    });

    it('يتجاهل المواعيد المكتملة أو البعيدة', () => {
        const events: UnifiedEvent[] = [
            makeEvent({
                id: 'ev-3',
                title: 'جلسة بعيدة',
                date: '2026-08-20',
                isCompleted: true,
            }),
        ];

        const ctx = buildCalendarSparkContext(events, { nowMs, horizonHours: 48 });
        expect(pickActiveCalendarSparkNudge(ctx)).toBeNull();
    });

    it('يكتشف تعارض تنقّل ضيق بين مواقع مختلفة', () => {
        const events: UnifiedEvent[] = [
            makeEvent({
                id: 'ev-a',
                title: 'جلسة أولى',
                date: '2026-08-05',
                time: '10:00',
                location: 'محكمة الكرخ',
            }),
            makeEvent({
                id: 'ev-b',
                title: 'جلسة ثانية',
                date: '2026-08-05',
                time: '10:30',
                location: 'محكمة الرصافة',
            }),
        ];

        const ctx = buildCalendarSparkContext(events, { nowMs, horizonHours: 48 });
        const nudge = pickActiveCalendarSparkNudge(ctx);

        expect(nudge?.kind).toBe('calendar.travel_conflict');
        expect(nudge?.action?.actionId).toBe('focus_day');
        expect(nudge?.targetFileId).toBe('2026-08-05');
    });

    it('يكتشف إثقال يوم بأكثر من ثلاثة مواعيد', () => {
        const events: UnifiedEvent[] = [
            makeEvent({ id: 'e1', title: 'أ', date: '2026-08-06', time: '09:00' }),
            makeEvent({ id: 'e2', title: 'ب', date: '2026-08-06', time: '10:00' }),
            makeEvent({ id: 'e3', title: 'ج', date: '2026-08-06', time: '11:00' }),
            makeEvent({ id: 'e4', title: 'د', date: '2026-08-06', time: '12:00' }),
        ];

        const ctx = buildCalendarSparkContext(events, { nowMs, horizonHours: 168 });
        const nudge = pickActiveCalendarSparkNudge(ctx);

        expect(nudge?.kind).toBe('calendar.schedule_overload');
    });

    it('يخفِي تنبيه التضارب عند عرض ScheduleConflictAlert لنفس اليوم', () => {
        const events: UnifiedEvent[] = [
            makeEvent({
                id: 'ev-a',
                title: 'جلسة أولى',
                date: '2026-08-05',
                time: '10:00',
                location: 'محكمة الكرخ',
                caseNo: '10/2026',
            }),
            makeEvent({
                id: 'ev-b',
                title: 'جلسة ثانية',
                date: '2026-08-05',
                time: '10:30',
                location: 'محكمة الرصافة',
                caseNo: '11/2026',
            }),
        ];

        const ctx = buildCalendarSparkContext(events, { nowMs, horizonHours: 48 });
        const withoutSuppress = pickActiveCalendarSparkNudge(ctx);
        const withSuppress = pickActiveCalendarSparkNudge(ctx, {
            suppressConflictNudgesForDate: '2026-08-05',
        });

        expect(withoutSuppress?.kind).toBe('calendar.travel_conflict');
        expect(withSuppress?.kind).not.toBe('calendar.travel_conflict');
        expect(withSuppress?.kind).toBe('calendar.hearing_today');
    });

    it('يكتشف مهلة قانونية منتهية', () => {
        const events: UnifiedEvent[] = [
            makeEvent({
                id: 'dl-1',
                title: 'مهلة استئناف',
                date: '2026-08-01',
                type: 'deadline',
                source: 'deadline',
            }),
        ];

        const ctx = buildCalendarSparkContext(events, { nowMs, horizonHours: 168 });
        const nudge = pickActiveCalendarSparkNudge(ctx);

        expect(nudge?.kind).toBe('calendar.deadline_overdue');
    });

    it('يكتشف مهلة قانونية قريبة', () => {
        const events: UnifiedEvent[] = [
            makeEvent({
                id: 'dl-2',
                title: 'مهلة تمييز',
                date: '2026-08-07',
                type: 'deadline',
                source: 'deadline',
            }),
        ];

        const ctx = buildCalendarSparkContext(events, { nowMs, horizonHours: 168 });
        const nudge = pickActiveCalendarSparkNudge(ctx);

        expect(nudge?.kind).toBe('calendar.deadline_near');
    });

    it('يكتشف جلسة اليوم', () => {
        const events: UnifiedEvent[] = [
            makeEvent({
                id: 'ht-1',
                title: 'جلسة مرافعة',
                date: '2026-08-05',
                time: '14:00',
                court: 'محكمة الرصافة',
            }),
        ];

        const ctx = buildCalendarSparkContext(events, { nowMs, horizonHours: 48 });
        const nudge = pickActiveCalendarSparkNudge(ctx);

        expect(nudge?.kind).toBe('calendar.hearing_today');
    });

    it('يفتح الإضبارة للموعد المربوط بدل التركيز فقط', () => {
        const events: UnifiedEvent[] = [
            makeEvent({
                id: 'cal_br-1',
                title: 'جلسة مربوطة',
                date: '2026-08-05',
                time: '14:00',
                isBridged: true,
                bridge: {
                    sourceModule: 'lawsuit',
                    sourceEntityId: 'law-55',
                    sourceEventId: 'appt-1',
                    calendarRecordId: 'rec-1',
                },
            }),
        ];

        const ctx = buildCalendarSparkContext(events, { nowMs, horizonHours: 48 });
        const nudge = pickActiveCalendarSparkNudge(ctx);

        expect(nudge?.kind).toBe('calendar.hearing_today');
        expect(nudge?.action).toEqual({ label: 'فتح الإضبارة', actionId: 'open_source' });
    });

    it('لا يُبلّغ عن جلسة بمحكمة مستخرجة من الملاحظات كناقصة', () => {
        const events: UnifiedEvent[] = [
            makeEvent({
                id: 'ev-court-notes',
                title: 'جلسة',
                date: '2026-08-05',
                time: '20:00',
                caseNo: '12/2026',
                court: 'محكمة الكرخ',
            }),
        ];

        const ctx = buildCalendarSparkContext(events, { nowMs, horizonHours: 48 });
        expect(pickActiveCalendarSparkNudge(ctx)?.kind).not.toBe('calendar.hearing_missing_court');
    });
});
