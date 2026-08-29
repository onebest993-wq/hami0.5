import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHomeHubLifecycle } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubLifecycle';
import {
    clearHomeHubPerfMarks,
    getHomeHubOpenToInteractiveMs,
    markHomeHubPerfPhase,
} from '@/app/services/alerts/homeHubPerfMetrics';

vi.mock('@/app/services/alerts/homeHubSentryReporting', () => ({
    reportHomeHubOpenToSentry: vi.fn(),
}));

describe('useHomeHubLifecycle', () => {
    beforeEach(() => {
        clearHomeHubPerfMarks();
    });

    it('isShellReady=false أثناء تحميل التنبيهات والرادار بدون محتوى', () => {
        const { result } = renderHook(() =>
            useHomeHubLifecycle({
                lawyerId: 'u1',
                alertsLoading: true,
                hubFullyEmpty: true,
                alertsTabCount: 0,
                pinsCount: 0,
                radarLoading: true,
                hadRadarCache: false,
                hadAlertsCache: false,
            }),
        );
        expect(result.current.isShellReady).toBe(false);
    });

    it('isShellReady=true مع كاش تنبيهات السكرتير', () => {
        const { result } = renderHook(() =>
            useHomeHubLifecycle({
                lawyerId: 'u1',
                alertsLoading: true,
                hubFullyEmpty: true,
                alertsTabCount: 0,
                pinsCount: 0,
                radarLoading: true,
                hadRadarCache: false,
                hadAlertsCache: true,
            }),
        );
        expect(result.current.isShellReady).toBe(true);
    });

    it('isShellReady=true مع كاش رادار', () => {
        const { result } = renderHook(() =>
            useHomeHubLifecycle({
                lawyerId: 'u1',
                alertsLoading: true,
                hubFullyEmpty: true,
                alertsTabCount: 0,
                pinsCount: 0,
                radarLoading: true,
                hadRadarCache: true,
                hadAlertsCache: false,
            }),
        );
        expect(result.current.isShellReady).toBe(true);
    });

    it('يسجّل interactive عند shell ready', () => {
        markHomeHubPerfPhase('open-request');
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:home-hub:open-request') {
                return [{ startTime: 800 }] as PerformanceEntryList;
            }
            if (name === 'hami:home-hub:interactive') {
                return [{ startTime: 1100 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        renderHook(() =>
            useHomeHubLifecycle({
                lawyerId: 'u1',
                alertsLoading: false,
                hubFullyEmpty: false,
                alertsTabCount: 1,
                pinsCount: 0,
                radarLoading: false,
                hadRadarCache: false,
                hadAlertsCache: false,
            }),
        );

        expect(getHomeHubOpenToInteractiveMs()).toBe(300);
    });

    it('H1: interactive احتياطي بعد 1.2s إن تأخرت الجاهزية', () => {
        vi.useFakeTimers();
        markHomeHubPerfPhase('open-request');
        const markSpy = vi.spyOn(performance, 'mark');

        renderHook(() =>
            useHomeHubLifecycle({
                lawyerId: 'u1',
                alertsLoading: true,
                hubFullyEmpty: true,
                alertsTabCount: 0,
                pinsCount: 0,
                radarLoading: true,
                hadRadarCache: false,
                hadAlertsCache: false,
            }),
        );

        expect(markSpy).not.toHaveBeenCalledWith('hami:home-hub:interactive');

        act(() => {
            vi.advanceTimersByTime(1_200);
        });

        expect(markSpy).toHaveBeenCalledWith('hami:home-hub:interactive');
        vi.useRealTimers();
    });
});
