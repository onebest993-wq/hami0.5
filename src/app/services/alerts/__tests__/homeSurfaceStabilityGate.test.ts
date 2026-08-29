import { describe, expect, it } from 'vitest';
import {
    evaluateHomeSurfaceStability,
    HOME_SURFACE_MAX_RECT_SHIFT_PX,
    HOME_SURFACE_POST_REVEAL_CLS_MAX,
    maxRectShiftFromAnchor,
    scorePostRevealHomeCls,
    type HomeSurfaceFrameSample,
    type HomeSurfaceLayoutShiftSample,
    type HomeSurfaceRectSample,
    type HomeSurfaceStabilityMetrics,
    type HomeSurfaceStabilityProbe,
    type HomeSurfaceStabilityVerdict,
} from '@/app/services/alerts/homeSurfaceStabilityGate';

function rect(partial: Partial<HomeSurfaceRectSample> = {}): HomeSurfaceRectSample {
    return { present: true, x: 97, y: 84, w: 520, h: 145, ...partial };
}

describe('homeSurfaceStabilityGate', () => {
    it('يحسب CLS بعد ظهور البطاقة فقط وعلى سطح الرئيسية', () => {
        const cls = scorePostRevealHomeCls(
            [
                { value: 0.4, startTime: 10, hadRecentInput: false, affectsHomeSurface: true },
                { value: 0.02, startTime: 400, hadRecentInput: false, affectsHomeSurface: true },
                { value: 0.08, startTime: 420, hadRecentInput: false, affectsHomeSurface: false },
                { value: 0.03, startTime: 430, hadRecentInput: true, affectsHomeSurface: true },
            ],
            350,
        );
        expect(cls).toBeCloseTo(0.02);
    });

    it('يقيس الإزاحة من أول إطار ظاهر لا من إطار إلى إطار', () => {
        expect(
            maxRectShiftFromAnchor([
                rect(),
                rect({ y: 86 }),
                rect({ h: 148 }),
            ]),
        ).toBe(3);
    });

    it('يرفض CLS أو قفزة هندسية فوق الحد', () => {
        const fail = evaluateHomeSurfaceStability({
            firstHubVisibleAt: 200,
            layoutShifts: [
                {
                    value: HOME_SURFACE_POST_REVEAL_CLS_MAX + 0.02,
                    startTime: 210,
                    hadRecentInput: false,
                    affectsHomeSurface: true,
                },
            ],
            frames: [
                { t: 200, hub: rect(), grid: rect({ w: 520, h: 400 }), header: rect({ h: 72 }) },
                {
                    t: 400,
                    hub: rect({ h: 145 + HOME_SURFACE_MAX_RECT_SHIFT_PX + 2 }),
                    grid: rect({ w: 520, h: 400 }),
                    header: rect({ h: 72 }),
                },
            ],
        });
        expect(fail.ok).toBe(false);
        expect(fail.failures.some((item) => item.startsWith('postRevealCls='))).toBe(true);
        expect(fail.failures.some((item) => item.startsWith('hubShiftPx='))).toBe(true);
    });

    it('يقبل سطحاً مستقراً بعد الكشف', () => {
        const pass = evaluateHomeSurfaceStability({
            firstHubVisibleAt: 180,
            layoutShifts: [
                { value: 0.2, startTime: 20, hadRecentInput: false, affectsHomeSurface: true },
                { value: 0.01, startTime: 200, hadRecentInput: false, affectsHomeSurface: true },
            ],
            frames: [
                { t: 180, hub: rect(), grid: rect({ h: 400 }), header: rect({ y: 0, h: 72 }) },
                { t: 400, hub: rect({ y: 85 }), grid: rect({ h: 401 }), header: rect({ y: 0, h: 72 }) },
                { t: 900, hub: rect({ y: 84 }), grid: rect({ h: 400 }), header: rect({ y: 0, h: 72 }) },
            ],
        });
        expect(pass.ok).toBe(true);
        expect(pass.metrics.postRevealCls).toBeCloseTo(0.01);
        expect(pass.metrics.hubShiftPx).toBeLessThanOrEqual(HOME_SURFACE_MAX_RECT_SHIFT_PX);
    });

    it('يرفض غياب البطاقة', () => {
        const probe: HomeSurfaceStabilityProbe = {
            firstHubVisibleAt: null,
            layoutShifts: [] as HomeSurfaceLayoutShiftSample[],
            frames: [] as HomeSurfaceFrameSample[],
        };
        const missing: HomeSurfaceStabilityVerdict = evaluateHomeSurfaceStability(probe);
        const metrics: HomeSurfaceStabilityMetrics = missing.metrics;
        expect(missing.ok).toBe(false);
        expect(missing.failures).toContain('hub never became visible');
        expect(metrics.framesCaptured).toBe(0);
    });
});
