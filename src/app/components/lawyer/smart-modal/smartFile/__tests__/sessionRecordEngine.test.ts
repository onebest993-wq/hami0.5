import { describe, expect, it } from 'vitest';
import type { TimelineEvent } from '../../../LawyerShared';
import {
    buildOpponentProceedingsPayload,
    buildSessionRecordPayload,
    collectUniqueHearingDates,
    computeNextSessionNumber,
    findCourtSessionRecordForDate,
    isOpponentProceedingsEvent,
    isSessionTimelineEvent,
    parseSessionRecordEvent,
    sessionNumberForHearingDate,
    suggestCurrentHearingDate,
    suggestNextHearingDate,
} from '../sessionRecordEngine';
import { shouldOpenAppointmentEditor } from '../timelineLegalDeadline';

describe('sessionRecordEngine', () => {
    it('detects session timeline events', () => {
        expect(isSessionTimelineEvent({ id: '1', type: 'decision', date: '2026-01-01', title: 'x', isSessionRecord: true })).toBe(true);
        expect(isSessionTimelineEvent({ id: '2', type: 'decision', date: '2026-01-01', title: 'محضر الجلسة 2' })).toBe(true);
        expect(isSessionTimelineEvent({ id: '3', type: 'note', date: '2026-01-01', title: 'ملاحظة' })).toBe(false);
    });

    it('computes next session number from unique unrecorded hearing dates', () => {
        const timeline: TimelineEvent[] = [
            { id: 'a', type: 'decision', date: '2026-01-01', title: 'محضر الجلسة 1', isSessionRecord: true },
            { id: 'b', type: 'appointment', date: '2026-02-01', title: 'جلسة', subType: 'pleading' },
        ];
        expect(computeNextSessionNumber(timeline)).toBe(2);
    });

    it('keeps one session number when first hearing and a pleading share the same day', () => {
        const timeline: TimelineEvent[] = [
            { id: 'b', type: 'appointment', date: '2026-01-15', title: 'مرافعة', subType: 'pleading' },
        ];
        expect(computeNextSessionNumber(timeline, '2026-01-15')).toBe(1);
        expect(sessionNumberForHearingDate(collectUniqueHearingDates(timeline, '2026-01-15'), '2026-01-15')).toBe(1);
    });

    it('finds the court session for a hearing date and rejects a second record on that day', () => {
        const timeline: TimelineEvent[] = [
            { id: 'a', type: 'decision', date: '2026-01-01', title: 'محضر الجلسة 1', isSessionRecord: true },
            { id: 'b', type: 'appointment', date: '2026-01-01', title: 'مرافعة', subType: 'pleading' },
        ];
        expect(findCourtSessionRecordForDate(timeline, '2026-01-01')?.id).toBe('a');
        expect(collectUniqueHearingDates(timeline, '2026-01-01')).toEqual(['2026-01-01']);
        expect(computeNextSessionNumber(timeline, '2026-01-01')).toBe(2);
    });

    it('parses and builds session record payload with judge decisions and next date', () => {
        const event: TimelineEvent = {
            id: 'e1',
            type: 'decision',
            date: '2026-03-10',
            title: 'محضر الجلسة 4',
            details: [
                'رقم الجلسة: 4',
                'تاريخ المرافعة القادمة: 2026-04-01',
                '',
                'مجريات الدعوى:',
                'تمت المرافعة.',
                '',
                'قرارات القاضي:',
                'تأجيل للمرافعة.',
            ].join('\n'),
            isSessionRecord: true,
        };
        expect(parseSessionRecordEvent(event)).toEqual({
            date: '2026-03-10',
            sessionNumber: '4',
            proceedings: 'تمت المرافعة.',
            judgeDecisions: 'تأجيل للمرافعة.',
            nextHearingDate: '2026-04-01',
        });
        expect(
            buildSessionRecordPayload({
                date: '2026-03-11',
                sessionNumber: '5',
                proceedings: 'نص',
                judgeDecisions: 'قرار',
                nextHearingDate: '2026-05-01',
            }),
        ).toMatchObject({
            title: 'محضر الجلسة 5',
            details: expect.stringContaining('قرارات القاضي'),
            isSessionRecord: true,
        });
    });

    it('suggests next pleading date after current session', () => {
        const timeline: TimelineEvent[] = [
            { id: 'p1', type: 'appointment', date: '2026-03-01', title: 'مرافعة', subType: 'pleading' },
            { id: 'p2', type: 'appointment', date: '2026-05-01', title: 'مرافعة', subType: 'pleading' },
        ];
        expect(suggestNextHearingDate(timeline, '2026-03-01')).toBe('2026-05-01');
        expect(suggestCurrentHearingDate(timeline)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('parses and builds opponent proceedings payload', () => {
        const event: TimelineEvent = {
            id: 'opp1',
            type: 'decision',
            date: '2026-03-10',
            title: 'تحركات وكيل الخصم — جلسة 3',
            details: [
                'رقم الجلسة: 3',
                '',
                'تحركات الطرف الآخر / وكيل الخصم:',
                'قدّم وكيل الخصم مذكرة جوابية.',
            ].join('\n'),
            isSessionRecord: true,
            isOpponentProceedings: true,
        };
        expect(isOpponentProceedingsEvent(event)).toBe(true);
        expect(parseSessionRecordEvent(event).proceedings).toBe('قدّم وكيل الخصم مذكرة جوابية.');
        expect(
            buildOpponentProceedingsPayload({
                date: '2026-03-11',
                sessionNumber: '4',
                proceedings: 'اعتراض شفهي',
                judgeDecisions: '',
                nextHearingDate: '',
            }),
        ).toMatchObject({
            title: 'تحركات وكيل الخصم — جلسة 4',
            isOpponentProceedings: true,
            details: expect.stringContaining('اعتراض شفهي'),
        });
    });

    it('opens the appointment editor only for non-hearing appointments', () => {
        const pleading: TimelineEvent = {
            id: 'p',
            type: 'appointment',
            date: '2026-01-01',
            title: 'مرافعة',
            subType: 'pleading',
        };
        const other: TimelineEvent = {
            id: 'x',
            type: 'appointment',
            date: '2026-01-02',
            title: 'استماع شهود',
        };
        expect(shouldOpenAppointmentEditor(pleading)).toBe(false);
        expect(shouldOpenAppointmentEditor(other)).toBe(true);
        expect(
            shouldOpenAppointmentEditor({
                id: 's',
                type: 'decision',
                date: '2026-01-01',
                title: 'محضر الجلسة 1',
                isSessionRecord: true,
            }),
        ).toBe(false);
    });
});
