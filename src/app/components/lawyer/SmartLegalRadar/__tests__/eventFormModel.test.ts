import { describe, expect, it } from 'vitest';
import { EMPTY_FORM, mapEventFormToCalendarFields } from '@/app/components/lawyer/SmartLegalRadar/eventFormModel';

describe('mapEventFormToCalendarFields', () => {
    it('يهذّب الحقول ويسقط التذكير بلا وقت', () => {
        expect(
            mapEventFormToCalendarFields({
                ...EMPTY_FORM,
                title: '  جلسة  ',
                date: '2026-08-13',
                time: '',
                location: '  قاعة  ',
                reminderMinutesBefore: 10,
            }),
        ).toEqual({
            title: 'جلسة',
            date: '2026-08-13',
            time: undefined,
            type: 'custom',
            location: 'قاعة',
            notes: undefined,
            clientName: undefined,
            clientPhone: undefined,
            reminderMinutesBefore: null,
        });
    });

    it('يبقي التذكير عند وجود وقت', () => {
        expect(
            mapEventFormToCalendarFields({
                ...EMPTY_FORM,
                title: 'موعد',
                date: '2026-08-13',
                time: '09:00',
                reminderMinutesBefore: 15,
            }).reminderMinutesBefore,
        ).toBe(15);
    });
});
