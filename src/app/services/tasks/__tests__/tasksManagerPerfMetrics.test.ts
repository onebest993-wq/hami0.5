import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
    clearTasksManagerPerfMarks,
    getTasksManagerOpenToInteractiveMs,
    markTasksManagerPerfPhase,
} from '@/app/services/tasks/tasksManagerPerfMetrics';

describe('tasksManagerPerfMetrics', () => {
    beforeEach(() => {
        clearTasksManagerPerfMarks();
        try {
            performance.clearMarks();
        } catch {
            /* ignore */
        }
        vi.restoreAllMocks();
    });

    it('يحسب ms من open-request إلى interactive', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:tasks-manager:open-request') {
                return [{ startTime: 120 } as PerformanceEntry];
            }
            if (name === 'hami:tasks-manager:interactive') {
                return [{ startTime: 305 } as PerformanceEntry];
            }
            return [];
        });
        markTasksManagerPerfPhase('open-request');
        markTasksManagerPerfPhase('interactive');
        expect(getTasksManagerOpenToInteractiveMs()).toBe(185);
    });

    it('يعيد null إذا لا توجد أي marks (Scenario B: no marks at all)', () => {
        vi.spyOn(performance, 'getEntriesByName').mockReturnValue([]);
        expect(getTasksManagerOpenToInteractiveMs()).toBeNull();
    });

    it('يعيد null إذا سُجِّل open-request فقط ثم أُغلق فوراً (Scenario A: close-immediate)', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:tasks-manager:open-request') {
                return [{ startTime: 80 } as PerformanceEntry];
            }
            return [];
        });
        markTasksManagerPerfPhase('open-request');
        expect(getTasksManagerOpenToInteractiveMs()).toBeNull();
    });

    it('يستخدم آخر marks عند تعدد الفتحات في الجلسة نفسها', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:tasks-manager:open-request') {
                return [
                    { startTime: 50 } as PerformanceEntry,
                    { startTime: 200 } as PerformanceEntry,
                    { startTime: 600 } as PerformanceEntry,
                ];
            }
            if (name === 'hami:tasks-manager:interactive') {
                return [
                    { startTime: 210 } as PerformanceEntry,
                    { startTime: 400 } as PerformanceEntry,
                    { startTime: 748 } as PerformanceEntry,
                ];
            }
            return [];
        });

        expect(getTasksManagerOpenToInteractiveMs()).toBe(148);
    });
});
