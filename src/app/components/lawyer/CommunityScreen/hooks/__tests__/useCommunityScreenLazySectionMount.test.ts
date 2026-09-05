import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const prefetchCommunityRepositorySection = vi.fn();
const prefetchCommunityGroupsSection = vi.fn();
const prefetchOpenForumInnerSectionChunks = vi.fn();
const scheduleIdleCommunityLazySectionPrefetch = vi.fn((onReady?: () => void) => {
    onReady?.();
    return () => undefined;
});

vi.mock('@/app/components/lawyer/CommunityScreen/communityScreenLazySections', () => ({
    prefetchCommunityRepositorySection,
    prefetchOpenForumInnerSectionChunks,
    prefetchCommunityGroupsSection,
    scheduleIdleCommunityLazySectionPrefetch,
}));

import { useCommunityScreenLazySectionMount } from '../useCommunityScreenLazySectionMount';

describe('useCommunityScreenLazySectionMount', () => {
    it('يُحمّل مقاطع JS عند الفتح دون تركيب المستودع/المجموعات على التغذية', async () => {
        const { result } = renderHook(() =>
            useCommunityScreenLazySectionMount('forum', true),
        );
        await waitFor(() => {
            expect(scheduleIdleCommunityLazySectionPrefetch).toHaveBeenCalled();
            expect(prefetchOpenForumInnerSectionChunks).toHaveBeenCalled();
        });
        expect(result.current.repositoryMounted).toBe(false);
        expect(result.current.groupsMounted).toBe(false);
    });

    it('يركب القسم عند نية اللمس قبل اكتمال النقرة', async () => {
        const { result } = renderHook(() =>
            useCommunityScreenLazySectionMount('forum', true),
        );
        await waitFor(() => {
            expect(prefetchOpenForumInnerSectionChunks).toHaveBeenCalled();
        });
        await act(async () => {
            result.current.warmLazySection('repository');
            await Promise.resolve();
        });
        await waitFor(() => {
            expect(prefetchCommunityRepositorySection).toHaveBeenCalled();
        });
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
