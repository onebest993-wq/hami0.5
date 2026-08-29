import { describe, expect, it } from 'vitest';
import { resolveNextExecutionVisitation } from '@/app/services/calendar/dossierSync/visitationCalendarSync';

describe('resolveNextExecutionVisitation', () => {
    it('يختار أقرب جلسة مجدولة غير موثّقة في المستقبل', () => {
        const next = resolveNextExecutionVisitation({
            visitationSchedule: {
                config: { startTime: '16:00', location: 'بيت الطفل' },
                sessions: [
                    { id: 'a', date: '2099-08-01', status: 'scheduled' },
                    { id: 'b', date: '2099-06-15', status: 'scheduled' },
                    {
                        id: 'c',
                        date: '2099-06-01',
                        status: 'completed',
                        documentedAt: '2099-06-01T00:00:00.000Z',
                    },
                ],
            },
        });
        expect(next).toEqual({
            date: '2099-06-15',
            time: '16:00',
            location: 'بيت الطفل',
        });
    });

    it('يرجع null بدون جدول أو بلا جلسة قادمة', () => {
        expect(resolveNextExecutionVisitation({})).toBeNull();
        expect(
            resolveNextExecutionVisitation({
                visitationSchedule: {
                    sessions: [{ id: 'old', date: '2020-01-01', status: 'scheduled' }],
                },
            }),
        ).toBeNull();
    });
});
