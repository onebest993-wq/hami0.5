import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    beginProfileShellExit,
    PROFILE_SURFACE_EXIT_MS,
    PROFILE_SURFACE_EXIT_PAD_MS,
} from '@/app/hooks/lawyerDashboard/profile/profileShellExit';

describe('profileShellExit', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.documentElement.removeAttribute('data-hami-profile-open');
        document.documentElement.removeAttribute('data-hami-profile-closing');
        document.documentElement.removeAttribute('data-hami-profile-studio-open');
        delete document.documentElement.dataset.hamiReduceMotion;
        vi.useFakeTimers();
    });

    afterEach(() => {
        document.documentElement.removeAttribute('data-hami-profile-closing');
        vi.useRealTimers();
    });

    it('مع تقليل الحركة يُغلق فوراً', () => {
        document.documentElement.dataset.hamiReduceMotion = '1';
        const onDone = vi.fn();
        beginProfileShellExit(onDone);
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('بدون سطح يغلق فوراً', () => {
        const onDone = vi.fn();
        beginProfileShellExit(onDone);
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('يتلاشى ثم ينهي بعد المهلة', () => {
        document.documentElement.setAttribute('data-hami-profile-open', '1');
        const surface = document.createElement('div');
        surface.setAttribute('data-testid', 'lawyer-dashboard-profile-surface');
        document.body.appendChild(surface);

        const onDone = vi.fn();
        beginProfileShellExit(onDone);
        expect(onDone).not.toHaveBeenCalled();
        expect(document.documentElement.getAttribute('data-hami-profile-closing')).toBe('1');

        vi.advanceTimersByTime(PROFILE_SURFACE_EXIT_MS + PROFILE_SURFACE_EXIT_PAD_MS);
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('يرفض الخروج إن كان استوديو الصفحة مركّباً', () => {
        const loading = document.createElement('div');
        loading.setAttribute('data-testid', 'profile-settings-sheet-loading');
        document.body.appendChild(loading);
        const onDone = vi.fn();
        beginProfileShellExit(onDone);
        expect(onDone).not.toHaveBeenCalled();
        expect(document.documentElement.getAttribute('data-hami-profile-closing')).toBeNull();
    });

    it('يرفض الخروج إن كانت نية الاستوديو على html', () => {
        document.documentElement.setAttribute('data-hami-profile-studio-open', '1');
        const onDone = vi.fn();
        beginProfileShellExit(onDone);
        expect(onDone).not.toHaveBeenCalled();
    });

    it('لا يرفض الخروج إن بقيت ورقة الاستوديو مخفية في الـ DOM', () => {
        const sheet = document.createElement('div');
        sheet.setAttribute('data-testid', 'profile-settings-sheet');
        sheet.setAttribute('aria-hidden', 'true');
        sheet.style.display = 'none';
        document.body.appendChild(sheet);
        const onDone = vi.fn();
        beginProfileShellExit(onDone);
        expect(onDone).toHaveBeenCalledTimes(1);
        sheet.remove();
    });
});
