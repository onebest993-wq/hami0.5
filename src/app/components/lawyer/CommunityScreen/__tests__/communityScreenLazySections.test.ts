import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const isLitePerformanceActive = vi.hoisted(() => vi.fn(() => false));
const warmRepositoryDocsCache = vi.hoisted(() => vi.fn());

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: () => isLitePerformanceActive(),
}));

vi.mock('@/app/services/forum/repositoryDocsWarmCache', () => ({
    warmRepositoryDocsCache: () => warmRepositoryDocsCache(),
}));

import { scheduleIdleCommunityLazySectionPrefetch } from '../communityScreenLazySections';

const lazySrc = fs.readFileSync(
    path.join(process.cwd(), 'src/app/components/lawyer/CommunityScreen/communityScreenLazySections.tsx'),
    'utf8',
);

describe('scheduleIdleCommunityLazySectionPrefetch', () => {
    afterEach(() => {
        isLitePerformanceActive.mockReturnValue(false);
        vi.unstubAllGlobals();
    });

    it('لا يجدول عملاً في وضع الأداء الخفيف', () => {
        isLitePerformanceActive.mockReturnValue(true);
        const requestIdleCallback = vi.fn();
        vi.stubGlobal('requestIdleCallback', requestIdleCallback);
        const cancel = scheduleIdleCommunityLazySectionPrefetch();
        expect(requestIdleCallback).not.toHaveBeenCalled();
        expect(typeof cancel).toBe('function');
        cancel();
    });

    it('يلغي المؤقت عند التنظيف إن لم يتوفر requestIdleCallback', () => {
        isLitePerformanceActive.mockReturnValue(false);
        vi.stubGlobal('requestIdleCallback', undefined);
        const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
        const cancel = scheduleIdleCommunityLazySectionPrefetch();
        cancel();
        expect(clearTimeoutSpy).toHaveBeenCalled();
        clearTimeoutSpy.mockRestore();
    });

    it('لا يستدعي onChunksReady في الوضع الخفيف', () => {
        isLitePerformanceActive.mockReturnValue(true);
        const onChunksReady = vi.fn();
        scheduleIdleCommunityLazySectionPrefetch(onChunksReady);
        expect(onChunksReady).not.toHaveBeenCalled();
    });

    it('مقطع JS في المصدر لا يسخّن كاش المستندات', () => {
        const chunkStart = lazySrc.indexOf('export function prefetchCommunityRepositorySectionChunk');
        const fullStart = lazySrc.indexOf('export function prefetchCommunityRepositorySection(');
        expect(chunkStart).toBeGreaterThan(-1);
        expect(fullStart).toBeGreaterThan(chunkStart);
        const chunkFn = lazySrc.slice(chunkStart, fullStart);
        expect(chunkFn).not.toContain('warmRepositoryDocsCache');
    });

    it('التسخين الكامل في المصدر يسخّن كاش المستندات', () => {
        const fullStart = lazySrc.indexOf('export function prefetchCommunityRepositorySection(');
        const groupsStart = lazySrc.indexOf('export function prefetchCommunityGroupsSection');
        const fullFn = lazySrc.slice(fullStart, groupsStart);
        expect(fullFn).toContain('warmRepositoryDocsCache()');
    });

    it('prefetchCommunityLazySectionChunks في المصدر مقطع JS فقط', () => {
        const start = lazySrc.indexOf('export function prefetchCommunityLazySectionChunks');
        const next = lazySrc.indexOf('export function prefetchPersistedCommunitySectionChunk');
        const fn = lazySrc.slice(start, next);
        expect(fn).toContain('prefetchCommunityRepositorySectionChunk()');
        expect(fn).not.toContain('prefetchCommunityRepositorySection()');
        expect(fn).not.toContain('warmRepositoryDocsCache');
    });

    it('الخمول لا يسخّن كاش المستندات', async () => {
        isLitePerformanceActive.mockReturnValue(false);
        warmRepositoryDocsCache.mockClear();
        vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
            cb();
            return 1;
        });
        scheduleIdleCommunityLazySectionPrefetch();
        await Promise.resolve();
        expect(warmRepositoryDocsCache).not.toHaveBeenCalled();
    });
});
