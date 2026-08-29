import { describe, expect, it, vi, beforeEach } from 'vitest';
import { isSectionBackgroundPrefetchAllowed, sectionBackgroundHydrateDelayMs } from '@/app/runtime/sectionPrefetchPolicy';

vi.mock('@/app/services/settings/settingsSnapshot', () => ({
    getLawyerSettingsSnapshot: vi.fn(() => ({
        security: { localOnlyMode: false },
        performance: { prefetchScreens: true, litePerformance: false },
    })),
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: vi.fn(() => false),
    isNativeShellStampedOnDom: vi.fn(() => false),
}));

describe('sectionPrefetchPolicy', () => {
    beforeEach(async () => {
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsSnapshot');
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: false },
            performance: { prefetchScreens: true, litePerformance: false },
        } as never);
        const { isLitePerformanceActive, isNativeShellStampedOnDom } = await import(
            '@/app/runtime/devicePerformanceTier'
        );
        vi.mocked(isLitePerformanceActive).mockReturnValue(false);
        vi.mocked(isNativeShellStampedOnDom).mockReturnValue(false);
    });

    it('يُمنع عند localOnly أو prefetchScreens=false أو lite', async () => {
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsSnapshot');
        expect(isSectionBackgroundPrefetchAllowed()).toBe(true);

        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: true },
            performance: { prefetchScreens: true, litePerformance: false },
        } as never);
        expect(isSectionBackgroundPrefetchAllowed()).toBe(false);

        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: false },
            performance: { prefetchScreens: false, litePerformance: false },
        } as never);
        expect(isSectionBackgroundPrefetchAllowed()).toBe(false);

        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: false },
            performance: { prefetchScreens: true, litePerformance: false },
        } as never);
        const { isLitePerformanceActive } = await import('@/app/runtime/devicePerformanceTier');
        vi.mocked(isLitePerformanceActive).mockReturnValue(true);
        expect(isSectionBackgroundPrefetchAllowed()).toBe(false);
        expect(isSectionBackgroundPrefetchAllowed({ allowOnLite: true })).toBe(true);
    });

    it('تأخير hydrate: ويب 0 / أصلي 80 / ممنوع -1', async () => {
        expect(sectionBackgroundHydrateDelayMs()).toBe(0);
        const { isNativeShellStampedOnDom } = await import('@/app/runtime/devicePerformanceTier');
        vi.mocked(isNativeShellStampedOnDom).mockReturnValue(true);
        expect(sectionBackgroundHydrateDelayMs()).toBe(80);
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsSnapshot');
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: true },
            performance: { prefetchScreens: true, litePerformance: false },
        } as never);
        expect(sectionBackgroundHydrateDelayMs()).toBe(-1);
    });
});
