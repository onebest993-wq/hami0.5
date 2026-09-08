import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
    clearFieldTasksPerfMarks,
    getFieldTasksOpenToInteractiveMs,
    markFieldTasksPerfPhase,
} from '@/app/services/fieldTasks/fieldTasksPerfMetrics';

describe('fieldTasksPerfMetrics', () => {
    beforeEach(() => {
        clearFieldTasksPerfMarks();
        try {
            performance.clearMarks();
        } catch {
            /* ignore */
        }
        vi.restoreAllMocks();
    });

    it('يحسب ms من open-request إلى interactive', () => {
        let openAt = 100;
        let interactiveAt = 250;
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:field-tasks:open-request') {
                return [{ startTime: openAt } as PerformanceEntry];
            }
            if (name === 'hami:field-tasks:interactive') {
                return [{ startTime: interactiveAt } as PerformanceEntry];
            }
            return [];
        });
        markFieldTasksPerfPhase('open-request');
        markFieldTasksPerfPhase('interactive');
        expect(getFieldTasksOpenToInteractiveMs()).toBe(150);
    });

    it('يعيد null إن نقصت مرحلة (لا marks على الإطلاق — Scenario B)', () => {
        vi.spyOn(performance, 'getEntriesByName').mockReturnValue([]);
        expect(getFieldTasksOpenToInteractiveMs()).toBeNull();
    });

    it('يعيد null إذا سُجِّل open-request فقط ثم أُغلق فوراً (Scenario A: close-immediate)', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:field-tasks:open-request') {
                return [{ startTime: 100 } as PerformanceEntry];
            }
            return [];
        });
        markFieldTasksPerfPhase('open-request');
        expect(getFieldTasksOpenToInteractiveMs()).toBeNull();
    });

    it('يستخدم آخر marks عند تعدد الفتحات في الجلسة نفسها', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:field-tasks:open-request') {
                return [{ startTime: 100 } as PerformanceEntry, { startTime: 400 } as PerformanceEntry];
            }
            if (name === 'hami:field-tasks:interactive') {
                return [{ startTime: 250 } as PerformanceEntry, { startTime: 560 } as PerformanceEntry];
            }
            return [];
        });

        expect(getFieldTasksOpenToInteractiveMs()).toBe(160);
    });
});
