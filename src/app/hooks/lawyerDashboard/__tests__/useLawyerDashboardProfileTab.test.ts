import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLawyerDashboardProfileTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';
import { warmProfileOnOpen } from '@/app/hooks/lawyerDashboard/profileIntentWarm';
import { loadRoyalLawyerProfileModule } from '@/app/runtime/royalLawyerProfileLoader';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('@/app/hooks/lawyerDashboard/profileIntentWarm', () => ({
    warmProfileOnHover: vi.fn(),
    warmProfileOnOpen: vi.fn(),
}));

vi.mock('@/app/runtime/royalLawyerProfileLoader', () => ({
    loadRoyalLawyerProfileModule: vi.fn(() => Promise.resolve({ RoyalLawyerProfile: () => null })),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void) => {
        fn();
        return () => undefined;
    },
}));

vi.mock('@/app/services/profile/profilePerfMetrics', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/profile/profilePerfMetrics')>();
    return {
        ...actual,
        clearProfilePerfMarks: vi.fn(),
        markProfilePerfPhase: vi.fn(),
    };
});

import {
    clearProfilePerfMarks,
    markProfilePerfPhase,
} from '@/app/services/profile/profilePerfMetrics';

describe('useLawyerDashboardProfileTab', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يفتح تبويب الملف للمستخدم المسجّل فوراً (flushSync)', async () => {
        const setActiveTab = vi.fn();
        const setShowCommunity = vi.fn();

        const { result } = renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab,
                setShowCommunity,
            }),
        );

        act(() => {
            result.current.openProfileTab();
        });

        expect(setActiveTab).toHaveBeenCalledWith('profile');
        expect(setShowCommunity).toHaveBeenCalledWith(false);
        expect(result.current.profileTabSessionKey).toBe(0);
        expect(result.current.profileOpenEpoch).toBe(1);
        expect(warmProfileOnOpen).toHaveBeenCalledWith('lawyer-1');
        expect(loadRoyalLawyerProfileModule).toHaveBeenCalledWith('lawyer-1');

        await act(async () => {
            await Promise.resolve();
        });
    });

    it('لا ينتظر chunk قبل تبديل التبويب', async () => {
        let resolveChunk!: (value: unknown) => void;
        vi.mocked(loadRoyalLawyerProfileModule).mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveChunk = resolve;
                }),
        );

        const setActiveTab = vi.fn();
        const { result } = renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab,
                setShowCommunity: vi.fn(),
            }),
        );

        act(() => {
            result.current.openProfileTab();
        });

        expect(setActiveTab).toHaveBeenCalledWith('profile');
        expect(loadRoyalLawyerProfileModule).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveChunk({ RoyalLawyerProfile: () => null });
            await Promise.resolve();
        });
    });

    it('يرفض فتح الملف بدون تسجيل دخول', () => {
        const setActiveTab = vi.fn();
        const setShowCommunity = vi.fn();

        const { result } = renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: null,
                activeTab: 'home',
                setActiveTab,
                setShowCommunity,
            }),
        );

        act(() => {
            result.current.openProfileTab();
        });

        expect(setActiveTab).not.toHaveBeenCalled();
    });

    it('يغلق تبويب الملف عند dismiss-transient-overlays', () => {
        let activeTab: 'home' | 'profile' = 'profile';
        const setActiveTab = vi.fn((next) => {
            activeTab = typeof next === 'function' ? next(activeTab) : next;
        });

        renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab,
                setActiveTab,
                setShowCommunity: vi.fn(),
            }),
        );

        act(() => {
            window.dispatchEvent(new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'vault' } }));
        });

        expect(setActiveTab).toHaveBeenCalled();
        expect(activeTab).toBe('home');
    });

    it('لا يعيد بناء الملف عند الفتح الثاني — sessionKey ثابت', async () => {
        const setActiveTab = vi.fn();
        const { result } = renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab,
                setShowCommunity: vi.fn(),
            }),
        );

        await act(async () => {
            result.current.openProfileTab();
            await Promise.resolve();
        });
        expect(result.current.profileTabSessionKey).toBe(0);

        await act(async () => {
            result.current.openProfileTab();
            await Promise.resolve();
        });
        expect(result.current.profileTabSessionKey).toBe(0);
        expect(result.current.profileOpenEpoch).toBe(2);
    });

    it('يتجاهل النقر المتكرر أثناء الفتح أو عند كون التبويب نشطاً', async () => {
        const setActiveTab = vi.fn();
        const { result, rerender } = renderHook(
            ({ activeTab }: { activeTab: 'home' | 'profile' }) =>
                useLawyerDashboardProfileTab({
                    userId: 'lawyer-1',
                    activeTab,
                    setActiveTab,
                    setShowCommunity: vi.fn(),
                }),
            { initialProps: { activeTab: 'home' as const } },
        );

        await act(async () => {
            result.current.openProfileTab();
            result.current.openProfileTab();
            await Promise.resolve();
        });

        expect(warmProfileOnOpen).toHaveBeenCalledTimes(1);
        expect(setActiveTab).toHaveBeenCalledTimes(1);

        rerender({ activeTab: 'profile' });
        await act(async () => {
            result.current.openProfileTab();
            await Promise.resolve();
        });
        expect(warmProfileOnOpen).toHaveBeenCalledTimes(1);
    });

    it('يسجّل open-request عند كل فتح من الهيدر', async () => {
        const { result } = renderHook(() =>
            useLawyerDashboardProfileTab({
                userId: 'lawyer-1',
                activeTab: 'home',
                setActiveTab: vi.fn(),
                setShowCommunity: vi.fn(),
            }),
        );

        vi.mocked(clearProfilePerfMarks).mockClear();
        vi.mocked(markProfilePerfPhase).mockClear();

        await act(async () => {
            result.current.openProfileTab();
            await Promise.resolve();
        });

        expect(clearProfilePerfMarks).toHaveBeenCalledTimes(1);
        expect(markProfilePerfPhase).toHaveBeenCalledWith('open-request');
    });
});
