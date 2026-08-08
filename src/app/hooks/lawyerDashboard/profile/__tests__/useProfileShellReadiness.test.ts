import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileShellReadiness } from '@/app/hooks/lawyerDashboard/profile/useProfileShellReadiness';
import { PROFILE_SHELL_HYDRATED_EVENT } from '@/app/runtime/profileBootHydrator';

vi.mock('@/app/services/auth/shellAuth', () => ({
    isRealSignedIn: (id?: string | null) => Boolean(id?.trim() && id !== 'guest'),
}));

vi.mock('@/app/services/profile/profileShellReadiness', () => ({
    isProfileShellReadySync: vi.fn(() => false),
    PROFILE_SHELL_READY_TIMEOUT_MS: 100,
    hasProfileTreePaintedInDom: vi.fn(() => false),
}));

import { isProfileShellReadySync } from '@/app/services/profile/profileShellReadiness';

describe('useProfileShellReadiness', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(isProfileShellReadySync).mockReturnValue(false);
    });

    it('warming=true أثناء التسخين لكن ready يبقى true للفتح الفوري', () => {
        const { result } = renderHook(() =>
            useProfileShellReadiness({ userId: 'lawyer-1', hostMounted: true }),
        );

        expect(result.current.ready).toBe(true);
        expect(result.current.warming).toBe(true);
    });

    it('يصبح ready عند حدث hydrate', () => {
        const { result } = renderHook(() =>
            useProfileShellReadiness({ userId: 'lawyer-1', hostMounted: true }),
        );

        act(() => {
            vi.mocked(isProfileShellReadySync).mockReturnValue(true);
            window.dispatchEvent(new Event(PROFILE_SHELL_HYDRATED_EVENT));
        });

        expect(result.current.ready).toBe(true);
        expect(result.current.warming).toBe(false);
    });

    it('fallback timeout يفتح الحاجز بعد المهلة', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() =>
            useProfileShellReadiness({ userId: 'lawyer-1', hostMounted: true }),
        );

        act(() => {
            vi.advanceTimersByTime(120);
        });

        expect(result.current.ready).toBe(true);
        vi.useRealTimers();
    });
});
