import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const prefetchCommunityRepositorySection = vi.fn();
const prefetchCommunityLazySectionChunks = vi.fn();
const prefetchCommunityGroupsSection = vi.fn();
const scheduleIdleCommunityLazySectionPrefetch = vi.fn((onReady?: () => void) => {
    onReady?.();
    return () => undefined;
});

vi.mock('@/app/components/lawyer/CommunityScreen/communityScreenLazySections', () => ({
    prefetchCommunityRepositorySection: () => prefetchCommunityRepositorySection(),
    prefetchCommunityLazySectionChunks: () => prefetchCommunityLazySectionChunks(),
    prefetchCommunityGroupsSection: () => prefetchCommunityGroupsSection(),
    scheduleIdleCommunityLazySectionPrefetch: (onReady?: () => void) =>
        scheduleIdleCommunityLazySectionPrefetch(onReady),
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: () => false,
}));

import { useCommunityScreenLazySectionMount } from '../useCommunityScreenLazySectionMount';

describe('useCommunityScreenLazySectionMount', () => {
    it('يُحمّل مقاطع JS عند الفتح دون تركيب المستودع/المجموعات على التغذية', () => {
        const { result } = renderHook(() =>
            useCommunityScreenLazySectionMount('forum', true),
        );
        expect(scheduleIdleCommunityLazySectionPrefetch).toHaveBeenCalled();
        expect(prefetchCommunityLazySectionChunks).toHaveBeenCalled();
        expect(result.current.repositoryMounted).toBe(false);
        expect(result.current.groupsMounted).toBe(false);
    });

    it('يركب القسم عند نية اللمس قبل اكتمال النقرة', () => {
        const { result } = renderHook(() =>
            useCommunityScreenLazySectionMount('forum', true),
        );
        act(() => {
            result.current.warmLazySection('repository');
        });
        expect(prefetchCommunityRepositorySection).toHaveBeenCalled();
        expect(result.current.repositoryMounted).toBe(true);
        expect(result.current.groupsMounted).toBe(false);
    });

    it('يفك تركيب المستودع عند العودة للمنتدى', () => {
        const { result, rerender } = renderHook(
            ({ section }: { section: 'forum' | 'repository' }) =>
                useCommunityScreenLazySectionMount(section, true),
            { initialProps: { section: 'repository' as const } },
        );
        expect(result.current.repositoryMounted).toBe(true);
        rerender({ section: 'forum' });
        expect(result.current.repositoryMounted).toBe(false);
        expect(result.current.groupsMounted).toBe(false);
    });
});
