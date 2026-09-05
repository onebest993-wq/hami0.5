import { beforeEach, describe, expect, it, vi } from 'vitest';

const prefetchExecutionArchiveOpen = vi.fn();
const prefetchLawsuitArchiveHubModule = vi.fn();

vi.mock('@/app/runtime/executionArchiveOpenSession', () => ({
    prefetchExecutionArchiveOpen: (...args: unknown[]) => prefetchExecutionArchiveOpen(...args),
}));

vi.mock('@/app/runtime/hubArchiveLoader', () => ({
    prefetchLawsuitArchiveHubModule: (...args: unknown[]) => prefetchLawsuitArchiveHubModule(...args),
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: vi.fn(() => false),
    isNativeShellStampedOnDom: vi.fn(() => false),
    isMeteredOrSlowNetwork: vi.fn(() => false),
}));

vi.mock('@/app/services/settings/settingsSnapshot', () => ({
    getLawyerSettingsSnapshot: vi.fn(() => ({
        security: { localOnlyMode: false },
        performance: { prefetchScreens: true, litePerformance: false },
    })),
}));

describe('hubArchiveAfterHomePaint', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const mod = await import('@/app/runtime/hubArchiveAfterHomePaint');
        mod.resetHubArchiveAfterHomePaintForTests();
        vi.mocked(
            (await import('@/app/services/settings/settingsSnapshot')).getLawyerSettingsSnapshot,
        ).mockReturnValue({
            security: { localOnlyMode: false },
            performance: { prefetchScreens: true, litePerformance: false },
        } as never);
        vi.mocked(
            (await import('@/app/runtime/devicePerformanceTier')).isLitePerformanceActive,
        ).mockReturnValue(false);
        vi.mocked(
            (await import('@/app/runtime/devicePerformanceTier')).isMeteredOrSlowNetwork,
        ).mockReturnValue(false);
    });

    it('يسخّن مسار فتح التنفيذ مرة واحدة بلا تكرار', async () => {
        const { prefetchHubArchivesAfterHomePaint } = await import(
            '@/app/runtime/hubArchiveAfterHomePaint'
        );

        prefetchHubArchivesAfterHomePaint();
        prefetchHubArchivesAfterHomePaint();

        await vi.waitFor(() => {
            expect(prefetchExecutionArchiveOpen).toHaveBeenCalledTimes(1);
        });
        await vi.waitFor(() => {
            expect(prefetchLawsuitArchiveHubModule).toHaveBeenCalledTimes(1);
        });
    });

    it('مع lite بدون recency تنفيذ لا يسخّن مسار الأرشيف', async () => {
        const { isLitePerformanceActive } = await import('@/app/runtime/devicePerformanceTier');
        vi.mocked(isLitePerformanceActive).mockReturnValue(true);

        const { prefetchHubArchivesAfterHomePaint, resetHubArchiveAfterHomePaintForTests } =
            await import('@/app/runtime/hubArchiveAfterHomePaint');
        resetHubArchiveAfterHomePaintForTests();

        prefetchHubArchivesAfterHomePaint();

        await new Promise((r) => setTimeout(r, 20));
        expect(prefetchExecutionArchiveOpen).not.toHaveBeenCalled();
        expect(prefetchLawsuitArchiveHubModule).not.toHaveBeenCalled();
    });

    it('مع lite وrecency تنفيذ يسخّن التنفيذ ويتخطى دعاوى الأرشيف', async () => {
        const { isLitePerformanceActive } = await import('@/app/runtime/devicePerformanceTier');
        vi.mocked(isLitePerformanceActive).mockReturnValue(true);
        const { rememberOpenedSectionChunk, resetSectionChunkRecencyForTests } = await import(
            '@/app/runtime/sectionChunkRecency'
        );
        resetSectionChunkRecencyForTests();
        rememberOpenedSectionChunk('execution');

        const { prefetchHubArchivesAfterHomePaint, resetHubArchiveAfterHomePaintForTests } =
            await import('@/app/runtime/hubArchiveAfterHomePaint');
        resetHubArchiveAfterHomePaintForTests();

        prefetchHubArchivesAfterHomePaint();

        await vi.waitFor(() => {
            expect(prefetchExecutionArchiveOpen).toHaveBeenCalledTimes(1);
        });
        expect(prefetchLawsuitArchiveHubModule).not.toHaveBeenCalled();
        resetSectionChunkRecencyForTests();
    });

    it('مع 2G بدون recency تنفيذ لا يسخّن مسار الأرشيف', async () => {
        const { isMeteredOrSlowNetwork } = await import('@/app/runtime/devicePerformanceTier');
        vi.mocked(isMeteredOrSlowNetwork).mockReturnValue(true);

        const { prefetchHubArchivesAfterHomePaint, resetHubArchiveAfterHomePaintForTests } =
            await import('@/app/runtime/hubArchiveAfterHomePaint');
        resetHubArchiveAfterHomePaintForTests();

        prefetchHubArchivesAfterHomePaint();

        await new Promise((r) => setTimeout(r, 20));
        expect(prefetchExecutionArchiveOpen).not.toHaveBeenCalled();
        expect(prefetchLawsuitArchiveHubModule).not.toHaveBeenCalled();
    });

    it('مع 2G وrecency تنفيذ يسخّن التنفيذ ويتخطى دعاوى الأرشيف', async () => {
        const { isMeteredOrSlowNetwork } = await import('@/app/runtime/devicePerformanceTier');
        vi.mocked(isMeteredOrSlowNetwork).mockReturnValue(true);
        const { rememberOpenedSectionChunk, resetSectionChunkRecencyForTests } = await import(
            '@/app/runtime/sectionChunkRecency'
        );
        resetSectionChunkRecencyForTests();
        rememberOpenedSectionChunk('execution');

        const { prefetchHubArchivesAfterHomePaint, resetHubArchiveAfterHomePaintForTests } =
            await import('@/app/runtime/hubArchiveAfterHomePaint');
        resetHubArchiveAfterHomePaintForTests();

        prefetchHubArchivesAfterHomePaint();

        await vi.waitFor(() => {
            expect(prefetchExecutionArchiveOpen).toHaveBeenCalledTimes(1);
        });
        expect(prefetchLawsuitArchiveHubModule).not.toHaveBeenCalled();
        resetSectionChunkRecencyForTests();
    });

    it('مع المحلي فقط وrecency تنفيذ يسخّن التنفيذ ويتخطى دعاوى الأرشيف', async () => {
        const { getLawyerSettingsSnapshot } = await import(
            '@/app/services/settings/settingsSnapshot'
        );
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: true },
            performance: { prefetchScreens: true, litePerformance: false },
        } as never);
        const { rememberOpenedSectionChunk, resetSectionChunkRecencyForTests } = await import(
            '@/app/runtime/sectionChunkRecency'
        );
        resetSectionChunkRecencyForTests();
        rememberOpenedSectionChunk('execution');

        const { prefetchHubArchivesAfterHomePaint, resetHubArchiveAfterHomePaintForTests } =
            await import('@/app/runtime/hubArchiveAfterHomePaint');
        resetHubArchiveAfterHomePaintForTests();

        prefetchHubArchivesAfterHomePaint();

        await vi.waitFor(() => {
            expect(prefetchExecutionArchiveOpen).toHaveBeenCalledTimes(1);
        });
        expect(prefetchLawsuitArchiveHubModule).not.toHaveBeenCalled();
        resetSectionChunkRecencyForTests();
    });

    it('يتخطى التسخين عند تعطيل prefetch', async () => {
        const { getLawyerSettingsSnapshot } = await import(
            '@/app/services/settings/settingsSnapshot'
        );
        vi.mocked(getLawyerSettingsSnapshot).mockReturnValue({
            security: { localOnlyMode: true },
            performance: { prefetchScreens: false, litePerformance: false },
        } as never);

        const { prefetchHubArchivesAfterHomePaint, resetHubArchiveAfterHomePaintForTests } =
            await import('@/app/runtime/hubArchiveAfterHomePaint');
        resetHubArchiveAfterHomePaintForTests();
        prefetchHubArchivesAfterHomePaint();

        await new Promise((r) => setTimeout(r, 20));
        expect(prefetchExecutionArchiveOpen).not.toHaveBeenCalled();
        expect(prefetchLawsuitArchiveHubModule).not.toHaveBeenCalled();
    });
});
