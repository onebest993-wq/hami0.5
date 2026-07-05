import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';
import {
    getRegisteredDashboardOverlayIds,
    registerDashboardOverlayCloser,
    resetDashboardOverlayCoordinatorForTests,
} from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';

describe('dashboardOverlayCoordinator', () => {
    beforeEach(() => {
        resetDashboardOverlayCoordinatorForTests();
    });

    it('dismiss مع except=field-tasks لا يغلق tasks-manager عند فتح الستارة', () => {
        const closeField = vi.fn();
        const closeManager = vi.fn();

        registerDashboardOverlayCloser('field-tasks', closeField);
        registerDashboardOverlayCloser('tasks-manager', closeManager);

        window.dispatchEvent(
            new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'field-tasks' } }),
        );

        expect(closeField).not.toHaveBeenCalled();
        expect(closeManager).not.toHaveBeenCalled();
    });

    it('dismiss مع except=repository لا يغلق notepad/vault legacy closers', () => {
        const closeRepository = vi.fn();
        const closeNotepad = vi.fn();
        const closeVault = vi.fn();
        const closeSettings = vi.fn();

        registerDashboardOverlayCloser('repository', closeRepository);
        registerDashboardOverlayCloser('notepad', closeNotepad);
        registerDashboardOverlayCloser('vault', closeVault);
        registerDashboardOverlayCloser('settings', closeSettings);

        window.dispatchEvent(
            new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'repository' } }),
        );

        expect(closeRepository).not.toHaveBeenCalled();
        expect(closeNotepad).not.toHaveBeenCalled();
        expect(closeVault).not.toHaveBeenCalled();
        expect(closeSettings).toHaveBeenCalledTimes(1);
    });

    it('dismiss مع except=profile لا يغلق profile-settings (لا طرد فوري للتبويب)', () => {
        const closeProfile = vi.fn();
        const closeProfileSettings = vi.fn();

        registerDashboardOverlayCloser('profile', closeProfile);
        registerDashboardOverlayCloser('profile-settings', closeProfileSettings);

        window.dispatchEvent(
            new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'profile' } }),
        );

        expect(closeProfile).not.toHaveBeenCalled();
        expect(closeProfileSettings).not.toHaveBeenCalled();
    });

    it('dismiss مع except=profile-settings لا يغلق تبويب الملف', () => {
        const closeProfile = vi.fn();
        const closeProfileSettings = vi.fn();

        registerDashboardOverlayCloser('profile', closeProfile);
        registerDashboardOverlayCloser('profile-settings', closeProfileSettings);

        window.dispatchEvent(
            new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'profile-settings' } }),
        );

        expect(closeProfile).not.toHaveBeenCalled();
        expect(closeProfileSettings).not.toHaveBeenCalled();
    });

    it('dismiss مع except=notifications لا يُغلق تبويب الملف', () => {
        const closeProfile = vi.fn();
        const closeNotifications = vi.fn();

        registerDashboardOverlayCloser('profile', closeProfile);
        registerDashboardOverlayCloser('notifications', closeNotifications);

        window.dispatchEvent(
            new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'notifications' } }),
        );

        expect(closeProfile).not.toHaveBeenCalled();
        expect(closeNotifications).not.toHaveBeenCalled();
    });

    it('dismiss مع except=vault يُغلق تبويب الملف', () => {
        const closeProfile = vi.fn();

        registerDashboardOverlayCloser('profile', closeProfile);

        window.dispatchEvent(
            new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: { except: 'vault' } }),
        );

        expect(closeProfile).toHaveBeenCalledTimes(1);
    });

    it('dismiss بدون except يغلق كل المسجّلين', () => {
        const closeRepository = vi.fn();
        const closeSettings = vi.fn();

        registerDashboardOverlayCloser('repository', closeRepository);
        registerDashboardOverlayCloser('settings', closeSettings);

        window.dispatchEvent(new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT, { detail: {} }));

        expect(closeRepository).toHaveBeenCalledTimes(1);
        expect(closeSettings).toHaveBeenCalledTimes(1);
        expect(getRegisteredDashboardOverlayIds()).toHaveLength(2);
    });
});
