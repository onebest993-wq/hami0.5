import { describe, it, expect } from 'vitest';
import {
    calculateActualDaysElapsed,
    calculateDaysRemaining,
    isGracePeriodExpired,
    calculateGracePeriodEndDate,
    parseLocalNotificationDate
} from './executionStateMachine';

describe('executionStateMachine — مهلة الإخبار من التاريخ الفعلي (أيام تقويمية)', () => {
    it('يبدأ العد من اليوم التالي للتبليغ: تبليغ 10/2 وسجل اليوم 20/2 → منقضٍ 9 أيام', () => {
        const notification = '2026-02-10';
        const recorded = new Date(2026, 1, 20, 12, 0, 0, 0);
        expect(calculateActualDaysElapsed(notification, recorded)).toBe(9);
        expect(calculateDaysRemaining(notification, recorded, 0)).toBe(0);
        expect(isGracePeriodExpired(notification, recorded, 0)).toBe(true);
    });

    it('لا ينزاح تاريخ YYYY-MM-DD بسبب UTC', () => {
        const d = parseLocalNotificationDate('2026-03-20');
        expect(d.getFullYear()).toBe(2026);
        expect(d.getMonth()).toBe(2);
        expect(d.getDate()).toBe(20);
    });

    it('نهاية المهلة = اليوم التالي للإخبار + 7 تقويمية', () => {
        const end = calculateGracePeriodEndDate('2026-02-10', 0);
        expect(end.getFullYear()).toBe(2026);
        expect(end.getMonth()).toBe(1);
        expect(end.getDate()).toBe(18);
    });

    it('يوم إضافي يدوي (+1) يمدّد الإجمالي إلى 8 أيام تقويمية', () => {
        const notification = '2026-02-10';
        const day = new Date(2026, 1, 17, 12, 0, 0, 0);
        expect(calculateActualDaysElapsed(notification, day)).toBe(6);
        expect(calculateDaysRemaining(notification, day, 1)).toBe(2);
        expect(isGracePeriodExpired(notification, day, 1)).toBe(false);
    });
});
