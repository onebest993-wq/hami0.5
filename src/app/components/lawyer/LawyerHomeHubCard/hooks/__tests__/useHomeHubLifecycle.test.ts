import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHomeHubLifecycle } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubLifecycle';
import {
    clearHomeHubPerfMarks,
    getHomeHubOpenToInteractiveMs,
    markHomeHubPerfPhase,
} from '@/app/services/alerts/homeHubPerfMetrics';
import {
    resetHomeHubRadarCacheForTests,
    setHomeHubRadarCacheForTests,
} from '@/app/services/alerts/homeHubRadarWarmCache';
import {
    resetHomeHubSecretaryAlertsCacheForTests,
    writeHomeHubSecretaryAlertsCache,
} from '@/app/services/alerts/homeHubSecretaryAlertsWarmCache';
import type { CalendarEvent } from '@/app/services/lawyer-cloud';

vi.mock('@/app/services/alerts/homeHubSentryReporting', () => ({
    reportHomeHubOpenToSentry: vi.fn(),
}));

const sampleEvent = (): CalendarEvent =>
    ({
        id: 'ev-1',
        title: 'test',
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        lawyerId: 'u1',
    }) as CalendarEvent;

describe('useHomeHubLifecycle', () => {
    beforeEach(() => {
        resetHomeHubRadarCacheForTests();
        resetHomeHubSecretaryAlertsCacheForTests();
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
            }),
        );
        expect(result.current.isShellReady).toBe(false);
    });

    it('isShellReady=true مع كاش تنبيهات السكرتير', async () => {
        writeHomeHubSecretaryAlertsCache('u1', [{ id: 'alert-1' } as never]);
        const { result } = renderHook(() =>
            useHomeHubLifecycle({
                lawyerId: 'u1',
                alertsLoading: true,
                hubFullyEmpty: true,
                alertsTabCount: 0,
                pinsCount: 0,
                radarLoading: true,
            }),
        );
        await waitFor(() => expect(result.current.isShellReady).toBe(true));
        expect(result.current.hadAlertsCache).toBe(true);
    });

    it('isShellReady=true مع كاش رادار', async () => {
        setHomeHubRadarCacheForTests('u1', [sampleEvent()]);
        const { result } = renderHook(() =>
            useHomeHubLifecycle({
                lawyerId: 'u1',
                alertsLoading: true,
                hubFullyEmpty: true,
                alertsTabCount: 0,
                pinsCount: 0,
                radarLoading: true,
            }),
        );
        await waitFor(() => expect(result.current.isShellReady).toBe(true));
        expect(result.current.hadRadarCache).toBe(true);
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
            }),
        );

        expect(getHomeHubOpenToInteractiveMs()).toBe(300);
    });
});
