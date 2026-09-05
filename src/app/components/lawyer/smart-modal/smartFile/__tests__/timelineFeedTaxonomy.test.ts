import { describe, expect, it } from 'vitest';
import {
    classifyTimelineEvent,
    filterTimelineFeed,
    formatTimelineCardBody,
    formatTimelineCardTitle,
    visibleCivilTimelineEvents,
} from '../timelineFeedTaxonomy';

describe('timelineFeedTaxonomy', () => {
    it('classifies events by source section', () => {
        expect(
            classifyTimelineEvent({
                id: '1',
                type: 'appointment',
                date: '2026-06-01',
                title: 'جلسة',
            }),
        ).toBe('appointment');

        expect(
            classifyTimelineEvent({
                id: '2',
                type: 'note',
                date: '2026-06-01',
                title: 'ملاحظة',
            }),
        ).toBe('note');

        expect(
            classifyTimelineEvent({
                id: '3',
                type: 'action',
                date: '2026-06-01',
                title: 'طلب',
                isFastTrack: true,
            }),
        ).toBe('request');

        expect(
            classifyTimelineEvent({
                id: '4',
                type: 'decision',
                date: '2026-06-01',
                title: 'محضر الجلسة 2',
                isSessionRecord: true,
            }),
        ).toBe('session');
    });

    it('filters by category and query together', () => {
        const events = [
            { id: '1', type: 'note', date: '2026-01-01', title: 'ملاحظة مهمة', details: 'نص' },
            { id: '2', type: 'appointment', date: '2026-01-02', title: 'جلسة مرافعة', details: 'موعد' },
        ];

        expect(filterTimelineFeed(events, { category: 'note' })).toHaveLength(1);
        expect(filterTimelineFeed(events, { category: 'appointment', query: 'مرافعة' })).toHaveLength(1);
        expect(filterTimelineFeed(events, { category: 'note', query: 'مرافعة' })).toHaveLength(0);
    });

    it('cleans fast track title and strips redundant status lines from body', () => {
        const event = {
            id: 'f1',
            type: 'action',
            date: '2026-06-18',
            title: 'لبليب - صدر قرار بالقبول',
            details: 'ليبليبليب\n\nالحالة: صدر قرار بالقبول',
            isFastTrack: true,
        };

        expect(formatTimelineCardTitle(event)).toBe('لبليب');
        expect(formatTimelineCardBody(event)).toBe('ليبليبليب');
    });

    it('strips note html stamps and appeal boilerplate from civil timeline body', () => {
        const noteEvent = {
            id: 'n1',
            type: 'note',
            date: '2026-08-04',
            title: 'ملاحظة',
            details:
                '<p data-dossier-note-stamp="1" class="text-white/45 text-[11px] select-none">04/08/2026 18:32</p>التلاتلاتلات',
        };
        expect(formatTimelineCardBody(noteEvent)).toBe('التلاتلاتلات');

        const appealEvent = {
            id: 'a1',
            type: 'milestone',
            date: '2026-08-04',
            title: 'استئناف',
            details:
                'تم تقديم استئناف برقم 123/2026\nمقدم الطعن: المدعى عليه\n📎 المستندات المنقولة متاحة في طلبات الإضبارة.',
        };
        expect(formatTimelineCardBody(appealEvent)).toBe(
            'تم تقديم استئناف برقم 123/2026\nمقدم الطعن: المدعى عليه',
        );
    });

    it('adds appointment hearing date to expanded civil timeline details', () => {
        const appointmentEvent = {
            id: 'ap1',
            type: 'appointment',
            date: '2026-08-04',
            title: 'موعد المرافعة بعد استئناف السير',
            details: 'بعد استئناف السير القانوني',
        };
        expect(formatTimelineCardBody(appointmentEvent)).toContain('موعد المرافعة:');
        expect(formatTimelineCardBody(appointmentEvent)).toContain('٢٠٢٦');
        expect(formatTimelineCardBody(appointmentEvent)).toContain('٤');
    });

    it('labels legal deadline appointments as تمييز deadline — not مرافعة', () => {
        const cassationDeadline = {
            id: 'appt_cassation_deadline_stage-1',
            type: 'appointment',
            date: '2026-09-03',
            title: 'مهلة التمييز',
            details: 'آخر مهلة للتمييز بعد الحكم الاستئنافي (شهر من صدور القرار)',
        };
        expect(classifyTimelineEvent(cassationDeadline)).toBe('procedural');
        expect(formatTimelineCardBody(cassationDeadline)).not.toContain('موعد المرافعة');
        expect(formatTimelineCardBody(cassationDeadline)).not.toContain('15 يوماً');
        expect(formatTimelineCardBody(cassationDeadline)).not.toMatch(/شهر من/);
    });

    it('hides computed remaining-period appointments from the civil feed', () => {
        const events = [
            {
                id: 'appt_cassation_deadline_stage-1',
                type: 'appointment' as const,
                date: '2026-09-03',
                title: 'مهلة التمييز',
            },
            {
                id: 'appt_judgment_stage-1',
                type: 'appointment' as const,
                date: '2026-08-31',
                title: 'تاريخ الحكم',
            },
        ];
        expect(visibleCivilTimelineEvents(events).map((e) => e.id)).toEqual(['appt_judgment_stage-1']);
    });

    it('hides آخر موعد طعن appointments from the civil feed', () => {
        expect(
            visibleCivilTimelineEvents([
                {
                    id: 'appt_appeal_deadline_stage-1',
                    type: 'appointment',
                    date: '2026-09-16',
                    title: 'آخر موعد طعن على الحكم',
                    details: 'آخر موعد للاستئناف (15 يوماً من اليوم التالي لصدور الحكم)',
                },
            ]),
        ).toEqual([]);
    });

    it('strips مهلة الاعتراض from ghayabi notice card body', () => {
        const body = formatTimelineCardBody({
            id: 'abs_notif_1',
            type: 'decision',
            date: '2026-09-02',
            title: 'التبليغ بالحكم الغيابي',
            details:
                'تم تسجيل تبليغ الحكم الغيابي بتاريخ 2026-09-02 — لبيليبليب.\nمهلة الاعتراض: 10 أيام من تاريخ التبليغ — تنتهي في 2026-09-12.',
        });
        expect(body).toContain('تم تسجيل تبليغ الحكم الغيابي');
        expect(body).toContain('لبيليبليب');
        expect(body).not.toContain('مهلة');
        expect(body).not.toContain('2026-09-12');
    });
});
