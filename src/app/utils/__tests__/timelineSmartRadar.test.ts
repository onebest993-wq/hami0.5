import { describe, expect, it } from 'vitest';
import {
    computeSmartTimelineRadarTop,
    prepareTimelineRadarEvents,
    timelineDescriptionForDisplay,
    timelineRadarRowKey,
} from '@/app/utils/timelineSmartDisplay';
import type { TimelineEvent } from '@/app/types/execution';

function addDaysYmd(offsetDays: number): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function ev(
    partial: Pick<TimelineEvent, 'id' | 'title' | 'date' | 'type'> &
        Partial<Omit<TimelineEvent, 'id' | 'title' | 'date' | 'type'>>
): TimelineEvent {
    return {
        ...partial,
    };
}

describe('computeSmartTimelineRadarTop', () => {
    it('puts pinned first, then critical deadlines, then newest', () => {
        const events: TimelineEvent[] = [
            ev({
                id: 'old',
                title: 'قديم',
                date: '2026-01-01',
                type: 'other',
                timestamp: '2026-01-01T10:00:00.000Z',
            }),
            ev({
                id: 'pinned',
                title: 'مثبت',
                date: '2026-01-02',
                type: 'other',
                timestamp: '2026-01-02T10:00:00.000Z',
                isPinned: true,
            }),
            ev({
                id: 'newest',
                title: 'الأحدث',
                date: '2026-01-09',
                type: 'other',
                timestamp: '2026-01-09T10:00:00.000Z',
            }),
            ev({
                id: 'due_soon',
                title: 'مهلة قريبة',
                date: '2026-01-05',
                type: 'appointment',
                timestamp: '2026-01-05T10:00:00.000Z',
                deadlineDate: addDaysYmd(2),
            }),
        ];

        const top = computeSmartTimelineRadarTop(events, { limit: 5 });
        expect(top.map((e) => e.id)).toEqual(['pinned', 'due_soon', 'newest', 'old']);
    });

    it('respects limit 5', () => {
        const many = Array.from({ length: 8 }).map((_, i) =>
            ev({
                id: `e${i}`,
                title: `t${i}`,
                date: `2026-01-${String(i + 1).padStart(2, '0')}`,
                type: 'other',
                timestamp: '2026-06-01T12:00:00.000Z',
            })
        );
        expect(computeSmartTimelineRadarTop(many, { limit: 5 })).toHaveLength(5);
    });
});

describe('timelineDescriptionForDisplay', () => {
    it('strips title prefix and keeps the substantive tail', () => {
        const event = ev({
            id: 'trust',
            title: 'صرف من الأمانات',
            date: '2026-06-01',
            type: 'financial',
            description: 'صرف من الأمانات تم صرف ٦٠٠٬٠٠٠ د.ع من رصيد الأمانات',
        });
        expect(timelineDescriptionForDisplay(event)).toBe('تم صرف ٦٠٠٬٠٠٠ د.ع من رصيد الأمانات');
    });

    it('strips title from first line and keeps detail lines', () => {
        const event = ev({
            id: 'third',
            title: 'استلام أموال محجوزة لدى الغير',
            date: '2026-06-01',
            type: 'financial',
            description:
                'استلام أموال محجوزة لدى الغير\nالجهة: الالب\nالمبلغ المُسلَّم: ٧٧٨٬٨٨٨ د.ع',
        });
        expect(timelineDescriptionForDisplay(event)).toBe(
            'الجهة: الالب\nالمبلغ المُسلَّم: ٧٧٨٬٨٨٨ د.ع'
        );
    });

    it('dedupes identical lines in multi-line description', () => {
        const event = ev({
            id: 'dup',
            title: 'حدث',
            date: '2026-06-01',
            type: 'other',
            description: 'سطر واحد\nسطر واحد\nسطر ثانٍ',
        });
        expect(timelineDescriptionForDisplay(event)).toBe('سطر واحد\nسطر ثانٍ');
    });
});

describe('prepareTimelineRadarEvents', () => {
    it('assigns unique ids for duplicate raw ids', () => {
        const events: TimelineEvent[] = [
            ev({ id: 'same', title: 'أ', date: '2026-06-01', type: 'other', timestamp: '2026-06-01T10:00:00Z' }),
            ev({ id: 'same', title: 'ب', date: '2026-06-02', type: 'other', timestamp: '2026-06-02T10:00:00Z' }),
        ];
        const prepared = prepareTimelineRadarEvents(events);
        expect(prepared.map((e) => e.id)).toEqual(['same', 'same__2']);
        expect(timelineRadarRowKey(prepared[0])).not.toBe(timelineRadarRowKey(prepared[1]));
    });
});
