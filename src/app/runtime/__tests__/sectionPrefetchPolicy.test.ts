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
    isMeteredOrSlowNetwork: vi.fn(() => false),
}));

describe('sectionPrefetchPolicy', () => {
    beforeEach(async () => {
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsSnapshot');
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: false },
            performance: { prefetchScreens: true, litePerformance: false },
        } as never);
        const { isLitePerformanceActive, isNativeShellStampedOnDom, isMeteredOrSlowNetwork } = await import(
            '@/app/runtime/devicePerformanceTier'
        );
        vi.mocked(isLitePerformanceActive).mockReturnValue(false);
        vi.mocked(isNativeShellStampedOnDom).mockReturnValue(false);
        vi.mocked(isMeteredOrSlowNetwork).mockReturnValue(false);
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
        expect(isSectionBackgroundPrefetchAllowed({ allowOnLite: true, allowOnMetered: true })).toBe(
            true,
        );
        const { isOpenSectionInnerJsPrefetchAllowed } = await import(
            '@/app/runtime/sectionPrefetchPolicy'
        );
        expect(isOpenSectionInnerJsPrefetchAllowed()).toBe(true);
    });

    it('كِسرة JS للمستودع تُسخَّن على lite/محلي وتُحجب فقط عند prefetchScreens=false', async () => {
        const { isRepositoryHubJsWarmAllowed } = await import(
            '@/app/runtime/sectionPrefetchPolicy'
        );
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsSnapshot');
        const { isLitePerformanceActive, isMeteredOrSlowNetwork } = await import(
            '@/app/runtime/devicePerformanceTier'
        );
        vi.mocked(isLitePerformanceActive).mockReturnValue(true);
        vi.mocked(isMeteredOrSlowNetwork).mockReturnValue(true);
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: true },
            performance: { prefetchScreens: true, litePerformance: true },
        } as never);
        expect(isRepositoryHubJsWarmAllowed()).toBe(true);

        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: false },
            performance: { prefetchScreens: false, litePerformance: false },
        } as never);
        expect(isRepositoryHubJsWarmAllowed()).toBe(false);
    });

    it('كِسرة JS للمعاملات تُسخَّن على lite/محلي وتُحجب فقط عند prefetchScreens=false', async () => {
        const { isTransactionsHubJsWarmAllowed } = await import(
            '@/app/runtime/sectionPrefetchPolicy'
        );
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsSnapshot');
        const { isLitePerformanceActive, isMeteredOrSlowNetwork } = await import(
            '@/app/runtime/devicePerformanceTier'
        );
        vi.mocked(isLitePerformanceActive).mockReturnValue(true);
        vi.mocked(isMeteredOrSlowNetwork).mockReturnValue(true);
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: true },
            performance: { prefetchScreens: true, litePerformance: true },
        } as never);
        expect(isTransactionsHubJsWarmAllowed()).toBe(true);

        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: false },
            performance: { prefetchScreens: false, litePerformance: false },
        } as never);
        expect(isTransactionsHubJsWarmAllowed()).toBe(false);
    });

    it('المحلي فقط يحجب الشبكة/الخلفية ويُبقي كِسرة آخر قسم', async () => {
        const { getLawyerSettingsSnapshot } = await import('@/app/services/settings/settingsSnapshot');
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: true },
            performance: { prefetchScreens: true, litePerformance: false },
        } as never);

        expect(isSectionBackgroundPrefetchAllowed()).toBe(false);
        expect(isSectionBackgroundPrefetchAllowed({ allowOnLocalOnly: true })).toBe(true);

        const { isOpenSectionInnerJsPrefetchAllowed } = await import(
            '@/app/runtime/sectionPrefetchPolicy'
        );
        expect(isOpenSectionInnerJsPrefetchAllowed()).toBe(true);

        const { rememberOpenedSectionChunk, resetSectionChunkRecencyForTests } = await import(
            '@/app/runtime/sectionChunkRecency'
        );
        const { isRecencyBackgroundWarmAllowed } = await import('@/app/runtime/sectionPrefetchPolicy');
        resetSectionChunkRecencyForTests();
        expect(isRecencyBackgroundWarmAllowed('execution')).toBe(false);
        rememberOpenedSectionChunk('execution');
        expect(isRecencyBackgroundWarmAllowed('execution')).toBe(true);
        resetSectionChunkRecencyForTests();
    });

    it('توفير البيانات / 2G يحجب الخلفية حتى مع lite=off؛ recency يبقى', async () => {
        const { isMeteredOrSlowNetwork } = await import('@/app/runtime/devicePerformanceTier');
        vi.mocked(isMeteredOrSlowNetwork).mockReturnValue(true);

        expect(isSectionBackgroundPrefetchAllowed()).toBe(false);
        expect(isSectionBackgroundPrefetchAllowed({ allowOnLite: true })).toBe(false);
        expect(isSectionBackgroundPrefetchAllowed({ allowOnMetered: true })).toBe(true);
        const { isOpenSectionInnerJsPrefetchAllowed } = await import(
            '@/app/runtime/sectionPrefetchPolicy'
        );
        expect(isOpenSectionInnerJsPrefetchAllowed()).toBe(false);

        const { rememberOpenedSectionChunk, resetSectionChunkRecencyForTests } = await import(
            '@/app/runtime/sectionChunkRecency'
        );
        const { isSectionWarmAllowedWhenLite, isRecencyBackgroundWarmAllowed } = await import(
            '@/app/runtime/sectionPrefetchPolicy'
        );
        resetSectionChunkRecencyForTests();
        expect(isSectionWarmAllowedWhenLite('execution')).toBe(false);
        expect(isRecencyBackgroundWarmAllowed('execution')).toBe(false);
        rememberOpenedSectionChunk('execution');
        expect(isSectionWarmAllowedWhenLite('execution')).toBe(true);
        expect(isRecencyBackgroundWarmAllowed('execution')).toBe(true);
        expect(isRecencyBackgroundWarmAllowed('lawsuit')).toBe(false);
        resetSectionChunkRecencyForTests();
    });

    it('recency على lite: فقط آخر قسم', async () => {
        const { isLitePerformanceActive } = await import('@/app/runtime/devicePerformanceTier');
        const { rememberOpenedSectionChunk, resetSectionChunkRecencyForTests } = await import(
            '@/app/runtime/sectionChunkRecency'
        );
        const {
            isRecencySectionWarmAllowed,
            isSectionWarmAllowedWhenLite,
        } = await import('@/app/runtime/sectionPrefetchPolicy');

        expect(isRecencySectionWarmAllowed()).toBe(true);
        expect(isSectionWarmAllowedWhenLite('execution')).toBe(true);

        vi.mocked(isLitePerformanceActive).mockReturnValue(true);
        resetSectionChunkRecencyForTests();
        expect(isSectionWarmAllowedWhenLite('execution')).toBe(false);
        rememberOpenedSectionChunk('execution');
        expect(isSectionWarmAllowedWhenLite('execution')).toBe(true);
        expect(isSectionWarmAllowedWhenLite('lawsuit')).toBe(false);
        resetSectionChunkRecencyForTests();
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
