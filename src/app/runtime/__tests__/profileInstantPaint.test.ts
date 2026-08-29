import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    beginProfileBackLock,
    clearProfileBackLock,
    clearProfileForceVisible,
    concealProfileWarmShell,
    isProfileBackLocked,
    isProfileForceVisible,
    releaseProfileFeatureChrome,
    removeProfileInstantBridge,
    revealProfileWarmShell,
    PROFILE_LIVE_PAINT_SETTLE_FRAMES,
    PROFILE_LIVE_SHELL_READY_EVENT,
    PROFILE_PROMOTE_SHELL_EVENT,
} from '@/app/runtime/profileInstantPaint';
import { resetUserIdentityUiStateForTests } from '@/app/services/profile/userIdentityUiState';
import {
    markProfileOpenedThisPage,
    resetProfileOpenedThisPageForTests,
} from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';

function appendCompleteProfile(surface: HTMLElement): void {
    const page = document.createElement('div');
    page.setAttribute('data-testid', 'lawyer-profile');
    const body = document.createElement('div');
    body.setAttribute('data-profile-page-body', '');
    page.appendChild(body);
    surface.appendChild(page);
}

async function waitSettleFrames(): Promise<void> {
    await new Promise<void>((resolve) => {
        const need = PROFILE_LIVE_PAINT_SETTLE_FRAMES + 1;
        const step = (left: number) => {
            if (left <= 0) {
                resolve();
                return;
            }
            requestAnimationFrame(() => step(left - 1));
        };
        step(need);
    });
}

describe('profileInstantPaint', () => {
    beforeEach(() => {
        clearProfileForceVisible();
        removeProfileInstantBridge();
        resetUserIdentityUiStateForTests();
        resetProfileOpenedThisPageForTests();
        document.documentElement.removeAttribute('data-hami-profile-open');
        document.documentElement.removeAttribute('data-hami-feature-open');
        document.documentElement.removeAttribute('data-hami-profile-back-locked');
        document.body.innerHTML = '';
    });

    afterEach(() => {
        clearProfileBackLock();
        clearProfileForceVisible();
        removeProfileInstantBridge();
        document.documentElement.removeAttribute('data-hami-profile-open');
        document.documentElement.removeAttribute('data-hami-feature-open');
        document.documentElement.removeAttribute('data-hami-profile-back-locked');
    });

    it('صفحة الفتح الكاملة في السطح: يكشف فوراً', () => {
        const surface = document.createElement('div');
        surface.setAttribute('data-testid', 'lawyer-dashboard-profile-surface');
        const cover = document.createElement('div');
        cover.setAttribute('data-profile-open-first-page', '');
        surface.appendChild(cover);
        document.body.appendChild(surface);

        expect(revealProfileWarmShell()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-profile-open')).toBe('1');
        expect(surface.style.visibility).toBe('visible');
    });

    it('سطح فارغ: لا يخفي الرئيسية ولا يرسم جسر هوية', () => {
        const surface = document.createElement('div');
        surface.setAttribute('data-testid', 'lawyer-dashboard-profile-surface');
        surface.style.visibility = 'hidden';
        surface.setAttribute('inert', '');
        document.body.appendChild(surface);

        expect(revealProfileWarmShell()).toBe(false);
        expect(isProfileForceVisible()).toBe(true);
        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);
        expect(document.getElementById('hami-profile-instant-bridge')).toBeNull();
        expect(surface.style.visibility).toBe('hidden');
    });

    it('شجرة حية كاملة داخل السطح: يكشف فوراً دون حدث React مؤجّل', () => {
        const surface = document.createElement('div');
        surface.setAttribute('data-testid', 'lawyer-dashboard-profile-surface');
        appendCompleteProfile(surface);
        document.body.appendChild(surface);
        const onLive = vi.fn();
        window.addEventListener(PROFILE_LIVE_SHELL_READY_EVENT, onLive);

        expect(revealProfileWarmShell()).toBe(true);
        expect(document.getElementById('hami-profile-instant-bridge')).toBeNull();
        expect(document.documentElement.getAttribute('data-hami-profile-open')).toBe('1');
        expect(surface.style.visibility).toBe('visible');
        expect(onLive).not.toHaveBeenCalled();
        window.removeEventListener(PROFILE_LIVE_SHELL_READY_EVENT, onLive);
    });

    it('كتل معلّقة: لا تؤخّر الكشف — الجسم جاهز والكتل إضافة', () => {
        const surface = document.createElement('div');
        surface.setAttribute('data-testid', 'lawyer-dashboard-profile-surface');
        appendCompleteProfile(surface);
        const pending = document.createElement('div');
        pending.setAttribute('data-profile-blocks-pending', '');
        surface.querySelector('[data-testid="lawyer-profile"]')?.appendChild(pending);
        document.body.appendChild(surface);

        expect(revealProfileWarmShell()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-profile-open')).toBe('1');
    });

    it('هيرو بلا جسم: لا يكشف حتى يكتمل الجسم', () => {
        const surface = document.createElement('div');
        surface.setAttribute('data-testid', 'lawyer-dashboard-profile-surface');
        const page = document.createElement('div');
        page.setAttribute('data-testid', 'lawyer-profile');
        surface.appendChild(page);
        document.body.appendChild(surface);

        expect(revealProfileWarmShell()).toBe(false);
        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);
        expect(document.getElementById('hami-profile-instant-bridge')).toBeNull();
    });

    it('يكشف بعد اكتمال الصفحة واستقرار الإطارات', async () => {
        const surface = document.createElement('div');
        surface.setAttribute('data-testid', 'lawyer-dashboard-profile-surface');
        document.body.appendChild(surface);

        revealProfileWarmShell();
        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);

        const onLive = vi.fn();
        window.addEventListener(PROFILE_LIVE_SHELL_READY_EVENT, onLive);
        appendCompleteProfile(surface);
        await waitSettleFrames();

        expect(document.documentElement.getAttribute('data-hami-profile-open')).toBe('1');
        expect(surface.style.visibility).toBe('visible');
        expect(document.getElementById('hami-profile-instant-bridge')).toBeNull();
        expect(onLive).toHaveBeenCalled();
        window.removeEventListener(PROFILE_LIVE_SHELL_READY_EVENT, onLive);
    });

    it('بلا سطح: لا علم فتح يخفي الرئيسية', () => {
        const promote = vi.fn();
        window.addEventListener(PROFILE_PROMOTE_SHELL_EVENT, promote);

        expect(revealProfileWarmShell()).toBe(false);
        expect(isProfileForceVisible()).toBe(true);
        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);
        expect(document.getElementById('hami-profile-instant-bridge')).toBeNull();
        expect(promote).toHaveBeenCalled();

        window.removeEventListener(PROFILE_PROMOTE_SHELL_EVENT, promote);
    });

    it('تحت FirstPaint: لا يكشف حتى تكتمل الصفحة', () => {
        const minimal = document.createElement('div');
        minimal.setAttribute('data-hami-home-first-paint-layer', '');
        document.body.appendChild(minimal);

        const surface = document.createElement('div');
        surface.setAttribute('data-testid', 'lawyer-dashboard-profile-surface');
        appendCompleteProfile(surface);
        document.body.appendChild(surface);

        expect(revealProfileWarmShell()).toBe(false);
        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);
    });

    it('conceals الملف ويضع closing ثم يحرّر feature-open', () => {
        const home = document.createElement('div');
        home.setAttribute('data-testid', 'lawyer-dashboard-home-surface');
        home.className = 'hami-dashboard-home-stack-cover is-active';
        document.body.appendChild(home);

        const surface = document.createElement('div');
        surface.setAttribute('data-testid', 'lawyer-dashboard-profile-surface');
        appendCompleteProfile(surface);
        document.body.appendChild(surface);
        document.documentElement.setAttribute('data-hami-feature-open', '1');

        revealProfileWarmShell();
        concealProfileWarmShell();

        expect(isProfileForceVisible()).toBe(false);
        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);
        expect(document.documentElement.getAttribute('data-hami-profile-closing')).toBe('1');
        expect(document.documentElement.hasAttribute('data-hami-home-force-visible')).toBe(false);
        expect(document.getElementById('hami-profile-instant-bridge')).toBeNull();
        expect(surface.style.visibility).toBe('hidden');
        expect(document.documentElement.hasAttribute('data-hami-feature-open')).toBe(false);
        expect(home.classList.contains('is-active')).toBe(true);
    });

    it('لا يخفي snap إن كانت نية الفتح قائمة في هذه الصفحة', () => {
        markProfileOpenedThisPage();
        document.documentElement.setAttribute('data-hami-profile-open', '1');
        concealProfileWarmShell();
        expect(document.documentElement.getAttribute('data-hami-profile-open')).toBe('1');
    });

    it('يقفل زر الرجوع حتى تكتمل لمسة الاسم', () => {
        beginProfileBackLock();
        expect(isProfileBackLocked()).toBe(true);
        window.dispatchEvent(new Event('pointerup', { bubbles: true }));
        window.dispatchEvent(new Event('click', { bubbles: true }));
        expect(isProfileBackLocked()).toBe(false);
        clearProfileBackLock();
    });

    it('releaseProfileFeatureChrome يزيل data-hami-feature-open', () => {
        document.documentElement.setAttribute('data-hami-feature-open', '1');
        releaseProfileFeatureChrome();
        expect(document.documentElement.hasAttribute('data-hami-feature-open')).toBe(false);
    });

    it('بعد conceal لا يعيد snap من اكتمال صفحة مؤجّل', async () => {
        const surface = document.createElement('div');
        surface.setAttribute('data-testid', 'lawyer-dashboard-profile-surface');
        document.body.appendChild(surface);

        revealProfileWarmShell();
        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);

        concealProfileWarmShell();
        appendCompleteProfile(surface);
        await waitSettleFrames();

        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);
        expect(isProfileForceVisible()).toBe(false);
        expect(surface.style.visibility).toBe('hidden');
    });
});
