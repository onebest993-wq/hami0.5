import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { BOOT_REVEAL_DONE_EVENT } from '@/app/bootstrap/bootReveal';
import { useHomeHubBadgeSettling } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubBadgeSettling';
import {
    resetHomeHubRadarCacheForTests,
    setHomeHubRadarCacheForTests,
} from '@/app/services/alerts/homeHubRadarWarmCache';
import { resetHomeHubSecretaryAlertsCacheForTests } from '@/app/services/alerts/homeHubSecretaryAlertsWarmCache';
import type { CalendarEvent } from '@/app/services/lawyer-cloud';

vi.mock('@/app/bootstrap/bootMetrics', () => ({
    markBootPhase: vi.fn(),
}));

vi.mock('@/app/runtime/nativeBootTelemetry', () => ({
    publishNativeBootTelemetry: vi.fn(),
}));

const sampleEvent = (): CalendarEvent =>
    ({
        id: 'ev-1',
        title: 'test',
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        lawyerId: 'lawyer-1',
    }) as CalendarEvent;

describe('useHomeHubBadgeSettling', () => {
    beforeEach(() => {
        resetHomeHubRadarCacheForTests();
        resetHomeHubSecretaryAlertsCacheForTests();
        window.__hamiBootRevealDone__ = false;
        try {
            sessionStorage.removeItem('hami_boot_complete');
            sessionStorage.removeItem('hami_splash_executed');
        } catch {
            /* ignore */
        }
    });

    afterEach(() => {
        window.__hamiBootRevealDone__ = false;
        resetHomeHubRadarCacheForTests();
        resetHomeHubSecretaryAlertsCacheForTests();
    });

    it('لا يعلّق جسم البطاقة على كشف الإقلاع — peek متزامن فلا settling أبدي', () => {
        const { result } = renderHook(() =>
            useHomeHubBadgeSettling({
                lawyerId: 'lawyer-1',
                secretaryAlerts: [],
            }),
        );

        expect(result.current.hubBootSettling).toBe(false);
        expect(result.current.hubBadgeCountsSettled).toBe(true);
        expect(result.current.bootRevealDone).toBe(false);
        expect(result.current.hadRadarCachePeek).toBe(false);

        act(() => {
            window.__hamiBootRevealDone__ = true;
            window.dispatchEvent(new Event(BOOT_REVEAL_DONE_EVENT));
        });

        expect(result.current.bootRevealDone).toBe(true);
        expect(result.current.hubBootSettling).toBe(false);
    });

    it('كاش الرادار يظهر في hadRadarCachePeek دون تعليق الشارات', () => {
        setHomeHubRadarCacheForTests('lawyer-1', [sampleEvent()]);
        window.__hamiBootRevealDone__ = true;

        const { result } = renderHook(() =>
            useHomeHubBadgeSettling({
                lawyerId: 'lawyer-1',
                secretaryAlerts: [],
            }),
        );

        expect(result.current.bootRevealDone).toBe(true);
        expect(result.current.hadRadarCachePeek).toBe(true);
        expect(result.current.hubBootSettling).toBe(false);
    });
});
