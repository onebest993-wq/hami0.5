import { describe, expect, it } from 'vitest';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import {
    formatEventTimeRange,
    resolveDisplayTitle,
    resolveKindLabel,
    shouldShowLegalCountdown,
    stripKindNoiseFromTitle,
} from '@/app/components/lawyer/SmartLegalRadar/eventCardDisplay';

function event(partial: Partial<UnifiedEvent> & Pick<UnifiedEvent, 'id' | 'title'>): UnifiedEvent {
    return {
        date: '2026-08-13',
        type: 'custom',
        source: 'calendar',
        ...partial,
    };
}

describe('eventCardDisplay', () => {
    it('يزيل ضجيج النوع من العنوان', () => {
        expect(stripKindNoiseFromTitle('جلسة — مرافعة مدنية')).toBe('مرافعة مدنية');
        expect(stripKindNoiseFromTitle('مهلة مستعجلة: طعن')).toBe('طعن');
    });

    it('يصنّف نوع المهمة والمرافعة والمهلة', () => {
        expect(
            resolveKindLabel(
                event({
                    id: 't1',
                    title: 'تبليغ الخصم',
                    isBridged: true,
                    bridge: {
                        sourceModule: 'task',
                        sourceEntityId: '1',
                        sourceEventId: 'e',
                        calendarRecordId: 'c',
                    },
                }),
            ),
        ).toBe('تبليغ');
        expect(resolveKindLabel(event({ id: 'h1', title: 'مرافعة أولى', type: 'hearing' }))).toBe(
            'موعد مرافعة',
        );
        expect(resolveKindLabel(event({ id: 'd1', title: 'انتهاء مهلة الطعن', type: 'deadline' }))).toBe(
            'مهلة',
        );
    });

    it('يعرض العنوان بعد التنظيف أو يسقط إلى النوع', () => {
        expect(
            resolveDisplayTitle(event({ id: 'a', title: 'جلسة — كشف ميداني' }), 'جلسة'),
        ).toBe('كشف ميداني');
        expect(resolveDisplayTitle(event({ id: 'b', title: '   ' }), 'موعد')).toBe('موعد');
    });

    it('يجمع وقت البداية والنهاية دون تكرار', () => {
        expect(formatEventTimeRange('09:00', '10:30')).toBe('09:00–10:30');
        expect(formatEventTimeRange('09:00', '09:00')).toBe('09:00');
        expect(formatEventTimeRange('', '10:00')).toBeNull();
    });

    it('يظهر عدّ المهلة للدعاوى المرتبطة لا للمهام الميدانية', () => {
        expect(
            shouldShowLegalCountdown(
                event({
                    id: 'l1',
                    title: 'مهلة طعن',
                    type: 'deadline',
                    isBridged: true,
                    bridge: {
                        sourceModule: 'lawsuit',
                        sourceEntityId: '1',
                        sourceEventId: 'e',
                        calendarRecordId: 'c',
                    },
                }),
            ),
        ).toBe(true);
        expect(
            shouldShowLegalCountdown(
                event({
                    id: 't2',
                    title: 'كشف',
                    isBridged: true,
                    bridge: {
                        sourceModule: 'task',
                        sourceEntityId: '1',
                        sourceEventId: 'e',
                        calendarRecordId: 'c',
                    },
                }),
            ),
        ).toBe(false);
    });
});
