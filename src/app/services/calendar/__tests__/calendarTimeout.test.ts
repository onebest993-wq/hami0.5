import { describe, expect, it, vi, afterEach } from 'vitest';
import {
    CALENDAR_MUTATION_TIMEOUT_MS,
    isCalendarTimeoutError,
    withCalendarTimeout,
} from '@/app/services/calendar/calendarTimeout';

describe('calendarTimeout', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('يميّز أخطاء المهلة', () => {
        expect(isCalendarTimeoutError(new Error('calendar-mutation-timeout'))).toBe(true);
        expect(isCalendarTimeoutError(new Error('calendar-save-timeout'))).toBe(true);
        expect(isCalendarTimeoutError(new Error('calendar-fetch-timeout'))).toBe(true);
        expect(isCalendarTimeoutError(new Error('network'))).toBe(false);
        expect(isCalendarTimeoutError('calendar-save-timeout')).toBe(false);
    });

    it('يرفض بعد المهلة ويمسح المؤقّت', async () => {
        vi.useFakeTimers();
        const pending = withCalendarTimeout(new Promise<string>(() => {}), 1_000, 'calendar-mutation-timeout');
        const assertion = expect(pending).rejects.toThrow('calendar-mutation-timeout');
        await vi.advanceTimersByTimeAsync(1_000);
        await assertion;
        expect(CALENDAR_MUTATION_TIMEOUT_MS).toBe(8_000);
    });

    it('يحسم الوعد الناجح قبل المهلة', async () => {
        vi.useFakeTimers();
        const pending = withCalendarTimeout(Promise.resolve('ok'), 5_000, 'calendar-mutation-timeout');
        await expect(pending).resolves.toBe('ok');
        await vi.advanceTimersByTimeAsync(5_000);
    });
});
