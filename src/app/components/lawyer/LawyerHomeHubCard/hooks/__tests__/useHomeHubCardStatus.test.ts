import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHomeHubCardStatus } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubCardStatus';

describe('useHomeHubCardStatus', () => {
    it('يثبّت hasItems أثناء التسوية ولا يرجع للفارغ', () => {
        const { result, rerender } = renderHook(
            (props: Parameters<typeof useHomeHubCardStatus>[0]) => useHomeHubCardStatus(props),
            {
                initialProps: {
                    alertsLoading: false,
                    alertsError: null,
                    alertsPanelActive: true,
                    radarLoading: false,
                    hasCarouselAlerts: true,
                    hasUrgentRadar: false,
                    hasAlerts: true,
                    pinCountForState: 0,
                    alertsTabCount: 2,
                    hadSecretaryCache: false,
                    hadRadarCachePeek: false,
                    hubBootSettling: true,
                    hubPanel: 'alerts' as const,
                    blockSize: 'normal' as const,
                },
            },
        );

        expect(result.current.hubHasItems).toBe(true);
        expect(result.current.hubFullyEmpty).toBe(false);

        rerender({
            alertsLoading: false,
            alertsError: null,
            alertsPanelActive: true,
            radarLoading: false,
            hasCarouselAlerts: false,
            hasUrgentRadar: false,
            hasAlerts: false,
            pinCountForState: 0,
            alertsTabCount: 0,
            hadSecretaryCache: false,
            hadRadarCachePeek: false,
            hubBootSettling: true,
            hubPanel: 'alerts',
            blockSize: 'normal',
        });

        expect(result.current.hubHasItems).toBe(true);
        expect(result.current.cardLayout.sectionMinHeightClass).toBe('min-h-0');
    });

    it('بعد الاستقرار يتبع العدّ الحي', () => {
        const { result } = renderHook(() =>
            useHomeHubCardStatus({
                alertsLoading: false,
                alertsError: null,
                alertsPanelActive: true,
                radarLoading: false,
                hasCarouselAlerts: false,
                hasUrgentRadar: false,
                hasAlerts: false,
                pinCountForState: 0,
                alertsTabCount: 0,
                hadSecretaryCache: false,
                hadRadarCachePeek: false,
                hubBootSettling: false,
                hubPanel: 'alerts',
                blockSize: 'normal',
            }),
        );

        expect(result.current.hubHasItems).toBe(false);
        expect(result.current.hubFullyEmpty).toBe(true);
        expect(result.current.cardLayout.mode).toBe('feed');
        expect(result.current.cardLayout.sectionMinHeightClass).toBe('min-h-0');
    });

    it('أثناء التسوية الفارغة يبقى ارتفاع الحالة الفارغة لا حد الـ feed', () => {
        const { result } = renderHook(() =>
            useHomeHubCardStatus({
                alertsLoading: false,
                alertsError: null,
                alertsPanelActive: true,
                radarLoading: false,
                hasCarouselAlerts: false,
                hasUrgentRadar: false,
                hasAlerts: false,
                pinCountForState: 0,
                alertsTabCount: 0,
                hadSecretaryCache: false,
                hadRadarCachePeek: false,
                hubBootSettling: true,
                hubPanel: 'alerts',
                blockSize: 'normal',
            }),
        );

        expect(result.current.hubHasItems).toBe(false);
        expect(result.current.cardLayout.sectionMinHeightClass).toBe('min-h-0');
        expect(result.current.hubFullyEmpty).toBe(true);
    });

    it('بعد انتهاء التسوية مع عناصر يعتمد حد الـ feed', () => {
        const base = {
            alertsLoading: false,
            alertsError: null,
            alertsPanelActive: true,
            radarLoading: false,
            hasCarouselAlerts: true,
            hasUrgentRadar: false,
            hasAlerts: true,
            pinCountForState: 0,
            alertsTabCount: 2,
            hadSecretaryCache: true,
            hadRadarCachePeek: false,
            hubPanel: 'alerts' as const,
            blockSize: 'normal' as const,
        };
        const { result, rerender } = renderHook(
            (props: Parameters<typeof useHomeHubCardStatus>[0]) => useHomeHubCardStatus(props),
            {
                initialProps: { ...base, hubBootSettling: true },
            },
        );

        expect(result.current.hubHasItems).toBe(true);
        expect(result.current.cardLayout.sectionMinHeightClass).toBe('min-h-0');

        rerender({ ...base, hubBootSettling: false });

        expect(result.current.cardLayout.sectionMinHeightClass).toBe('min-h-[240px]');
    });
});
