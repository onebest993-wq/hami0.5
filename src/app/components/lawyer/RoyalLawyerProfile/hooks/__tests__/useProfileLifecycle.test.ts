import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useProfileLifecycle } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileLifecycle';
import {
    clearProfilePerfMarks,
    getProfileOpenToInteractiveMs,
    markProfilePerfPhase,
} from '@/app/services/profile/profilePerfMetrics';
import {
    invalidateProfileWarmCache,
    setProfileWarmCache,
} from '@/app/services/profile/profileWarmCache';
import * as profilePerfMetrics from '@/app/services/profile/profilePerfMetrics';

vi.mock('@/app/services/profile/profileSentryReporting', () => ({
    reportProfileOpenToSentry: vi.fn(),
}));

describe('useProfileLifecycle', () => {
    beforeEach(() => {
        invalidateProfileWarmCache();
        clearProfilePerfMarks();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('isShellReady=true مع كاش دافئ', async () => {
        setProfileWarmCache('u1', {
            header: { name: 'أحمد', title: '', coverImage: '', profileImage: '' },
            sections: [],
        });
        const { result } = renderHook(() =>
            useProfileLifecycle({
                profileUserId: 'u1',
                loading: true,
                hasHeader: true,
                isOwnProfile: true,
            }),
        );
        await waitFor(() => expect(result.current.isShellReady).toBe(true));
        expect(result.current.hadWarmCache).toBe(true);
    });

    it('يعيد قياس interactive عند تغيّر perfOpenEpoch', () => {
        markProfilePerfPhase('open-request');
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:profile:open-request') {
                return [{ startTime: 100 }] as PerformanceEntryList;
            }
            if (name === 'hami:profile:interactive') {
                return [{ startTime: 500 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        const { rerender } = renderHook(
            ({ epoch }: { epoch: number }) =>
                useProfileLifecycle({
                    profileUserId: 'u1',
                    loading: false,
                    hasHeader: true,
                    isOwnProfile: true,
                    perfOpenEpoch: epoch,
                }),
            { initialProps: { epoch: 1 } },
        );

        expect(getProfileOpenToInteractiveMs()).toBe(400);

        markProfilePerfPhase('open-request');
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:profile:open-request') {
                return [{ startTime: 300 }] as PerformanceEntryList;
            }
            if (name === 'hami:profile:interactive') {
                return [{ startTime: 700 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        rerender({ epoch: 2 });
        expect(getProfileOpenToInteractiveMs()).toBe(400);
    });

    it('يسجّل interactive عند الجاهزية', () => {
        markProfilePerfPhase('open-request');
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:profile:open-request') {
                return [{ startTime: 200 }] as PerformanceEntryList;
            }
            if (name === 'hami:profile:interactive') {
                return [{ startTime: 600 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        renderHook(() =>
            useProfileLifecycle({
                profileUserId: 'u1',
                loading: false,
                hasHeader: true,
                isOwnProfile: true,
            }),
        );

        expect(getProfileOpenToInteractiveMs()).toBe(400);
    });

    it('يسجّل interactive احتياطي بعد 1.2s إن لم تجهز الصدفة', () => {
        vi.useFakeTimers();
        const spy = vi.spyOn(profilePerfMetrics, 'markProfilePerfPhase');

        renderHook(() =>
            useProfileLifecycle({
                profileUserId: 'u1',
                loading: true,
                hasHeader: false,
                isOwnProfile: true,
                perfOpenEpoch: 1,
            }),
        );

        expect(spy).not.toHaveBeenCalledWith('interactive');

        act(() => {
            vi.advanceTimersByTime(1_200);
        });

        expect(spy).toHaveBeenCalledWith('interactive');
    });
});
