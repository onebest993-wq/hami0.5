import { describe, it, expect, beforeEach, vi } from 'vitest';
import { debug } from '@/app/utils/debug';
import {
    getBootTimeline,
    getDashboardToFirstTabOpenMs,
    markBootPhase,
    reportBootTimeline,
} from '@/app/bootstrap/bootMetrics';

describe('bootMetrics', () => {
    beforeEach(() => {
        vi.spyOn(debug, 'log').mockImplementation(() => undefined);
        performance.clearMarks();
    });

    it('records boot phases without throwing', () => {
        markBootPhase('start');
        markBootPhase('overlay-removed');
        markBootPhase('app-render');
        expect(performance.getEntriesByName('hami:boot:start', 'mark')).toHaveLength(1);
    });

    it('reportBootTimeline forwards timeline to debug.log when marks exist', () => {
        markBootPhase('start');
        markBootPhase('shell-visible');
        reportBootTimeline();
        expect(debug.log).toHaveBeenCalled();
    });

    it('getBootTimeline returns ms from start', () => {
        markBootPhase('start');
        markBootPhase('static-shell-visible');
        markBootPhase('dashboard-interactive');
        markBootPhase('first-tab-open');
        const rows = getBootTimeline();
        expect(rows.find((r) => r.phase === 'static-shell-visible')?.ms).toBeGreaterThanOrEqual(0);
        expect(rows.find((r) => r.phase === 'dashboard-interactive')?.ms).toBeGreaterThanOrEqual(0);
        expect(rows.find((r) => r.phase === 'first-tab-open')?.ms).toBeGreaterThanOrEqual(0);
    });

    it('measures dashboard-interactive → first-tab-open', () => {
        markBootPhase('dashboard-interactive');
        markBootPhase('first-tab-open');
        expect(getDashboardToFirstTabOpenMs()).toBeGreaterThanOrEqual(0);
    });
});
