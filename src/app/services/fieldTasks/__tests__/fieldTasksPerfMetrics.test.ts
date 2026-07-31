import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
    clearFieldTasksPerfMarks,
    getFieldTasksOpenToInteractiveMs,
    markFieldTasksPerfPhase,
} from '@/app/services/fieldTasks/fieldTasksPerfMetrics';

describe('fieldTasksPerfMetrics', () => {
    beforeEach(() => {
        clearFieldTasksPerfMarks();
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

    it('يعيد null إن نقصت مرحلة', () => {
        vi.spyOn(performance, 'getEntriesByName').mockReturnValue([]);
        expect(getFieldTasksOpenToInteractiveMs()).toBeNull();
    });
});
