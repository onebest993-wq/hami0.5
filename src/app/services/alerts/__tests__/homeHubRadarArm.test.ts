import { describe, expect, it } from 'vitest';
import {
    resolveHomeHubLiveRadarEnabled,
    shouldArmHomeHubLiveRadar,
} from '@/app/services/alerts/homeHubRadarArm';

describe('shouldArmHomeHubLiveRadar', () => {
    it('خارج تبويب التنبيهات لا يُسلَّح', () => {
        expect(
            shouldArmHomeHubLiveRadar({
                alertsPanelActive: false,
                secretaryAlertCount: 2,
                radarCache: null,
            }),
        ).toBe(false);
    });

    it('تسخين جارٍ يؤجّل الاكتشاف بلا سكرتير', () => {
        expect(
            shouldArmHomeHubLiveRadar({
                alertsPanelActive: true,
                secretaryAlertCount: 0,
                radarCache: null,
                deferForInFlightWarm: true,
            }),
        ).toBe(false);
        expect(
            shouldArmHomeHubLiveRadar({
                alertsPanelActive: true,
                secretaryAlertCount: 1,
                radarCache: null,
                deferForInFlightWarm: true,
            }),
        ).toBe(true);
    });

    it('كاش غير مؤكَّد يستدعي الاكتشاف', () => {
        expect(
            shouldArmHomeHubLiveRadar({
                alertsPanelActive: true,
                secretaryAlertCount: 0,
                radarCache: null,
            }),
        ).toBe(true);
    });

    it('فراغ مؤكَّد بلا سكرتير لا يُسلَّح', () => {
        expect(
            shouldArmHomeHubLiveRadar({
                alertsPanelActive: true,
                secretaryAlertCount: 0,
                radarCache: [],
            }),
        ).toBe(false);
    });

    it('سكرتير أو أحداث في الكاش يُسلَّحان', () => {
        expect(
            shouldArmHomeHubLiveRadar({
                alertsPanelActive: true,
                secretaryAlertCount: 1,
                radarCache: [],
            }),
        ).toBe(true);
        expect(
            shouldArmHomeHubLiveRadar({
                alertsPanelActive: true,
                secretaryAlertCount: 0,
                radarCache: [{ id: 'ev-1' }],
            }),
        ).toBe(true);
    });
});

describe('resolveHomeHubLiveRadarEnabled', () => {
    it('القفل يبقى بعد فراغ لاحق ولا يعمل خارج تبويب التنبيهات', () => {
        const afterEmpty = resolveHomeHubLiveRadarEnabled({
            alertsPanelActive: true,
            secretaryAlertCount: 0,
            radarCache: [],
            latched: true,
        });
        expect(afterEmpty.enabled).toBe(true);
        expect(afterEmpty.latch).toBe(true);

        const onPins = resolveHomeHubLiveRadarEnabled({
            alertsPanelActive: false,
            secretaryAlertCount: 0,
            radarCache: null,
            latched: true,
        });
        expect(onPins.enabled).toBe(false);
        expect(onPins.latch).toBe(true);
    });

    it('الفراغ المؤكَّد بلا قفل يبقى خاملاً', () => {
        const idle = resolveHomeHubLiveRadarEnabled({
            alertsPanelActive: true,
            secretaryAlertCount: 0,
            radarCache: [],
            latched: false,
        });
        expect(idle.enabled).toBe(false);
        expect(idle.latch).toBe(false);
    });
});
