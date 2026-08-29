import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    PROFILE_HOST_IDLE_RELEASE_MS,
    scheduleProfileHostIdleRelease,
} from '@/app/hooks/lawyerDashboard/profile/profileHostIdleRelease';

const snap = vi.hoisted(() => ({
    isProfileShellSnappedOpen: vi.fn(() => false),
    isProfileShellClosing: vi.fn(() => false),
}));

vi.mock('@/app/services/profile/profileShellSnap', () => ({
    isProfileShellSnappedOpen: () => snap.isProfileShellSnappedOpen(),
    isProfileShellClosing: () => snap.isProfileShellClosing(),
}));

describe('scheduleProfileHostIdleRelease', () => {
    afterEach(() => {
        vi.useRealTimers();
        snap.isProfileShellSnappedOpen.mockReturnValue(false);
        snap.isProfileShellClosing.mockReturnValue(false);
    });

    it('يستدعي التفكيك بعد المهلة إن الملف مغلق', () => {
        vi.useFakeTimers();
        const release = vi.fn();
        const cancel = scheduleProfileHostIdleRelease(release);
        vi.advanceTimersByTime(PROFILE_HOST_IDLE_RELEASE_MS - 1);
        expect(release).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(release).toHaveBeenCalledTimes(1);
        cancel();
    });

    it('يلغي المؤقت قبل المهلة', () => {
        vi.useFakeTimers();
        const release = vi.fn();
        const cancel = scheduleProfileHostIdleRelease(release);
        cancel();
        vi.advanceTimersByTime(PROFILE_HOST_IDLE_RELEASE_MS);
        expect(release).not.toHaveBeenCalled();
    });

    it('لا يفكك إن الـ snap ما زال مفتوحاً', () => {
        vi.useFakeTimers();
        snap.isProfileShellSnappedOpen.mockReturnValue(true);
        const release = vi.fn();
        scheduleProfileHostIdleRelease(release);
        vi.advanceTimersByTime(PROFILE_HOST_IDLE_RELEASE_MS);
        expect(release).not.toHaveBeenCalled();
    });
});
