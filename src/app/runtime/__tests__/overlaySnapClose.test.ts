import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearOverlayCoveredUnfreeze,
    executeGlobalSearchOverlayClose,
    executeNotificationsOverlayClose,
    executeOverlayCoveredUnfreezeClose,
    executeOverlaySnapClose,
    executeProfileOverlayClose,
    executeScheduleOverlayClose,
    executeSettingsOverlayClose,
    executeTransactionsOverlayClose,
    executeFieldTasksOverlayClose,
    executeTasksManagerOverlayClose,
    executeRepositoryOverlayClose,
    executeForumOverlayClose,
    markOverlaySnapClosing,
    OVERLAY_UNFREEZE_ATTR,
} from '@/app/runtime/overlaySnapClose';

vi.mock('@/app/utils/bodyScrollLock', () => ({
    reconcileBodyScrollLock: vi.fn(),
}));

import { reconcileBodyScrollLock } from '@/app/utils/bodyScrollLock';

describe('overlaySnapClose', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-hami-overlay-snap-close');
        document.documentElement.removeAttribute(OVERLAY_UNFREEZE_ATTR);
        document.documentElement.removeAttribute('data-hami-native');
        document.body.replaceChildren();
        vi.clearAllMocks();
    });

    it('يعلّم html ثم يزيل العلم في microtask', async () => {
        markOverlaySnapClosing();
        expect(document.documentElement.getAttribute('data-hami-overlay-snap-close')).toBe('1');
        await Promise.resolve();
        expect(document.documentElement.hasAttribute('data-hami-overlay-snap-close')).toBe(false);
    });

    it('ينفّذ conceal ثم commit ويحرّر scroll lock', () => {
        const conceal = vi.fn();
        const commit = vi.fn();
        executeOverlaySnapClose({ conceal, commit });
        expect(conceal).toHaveBeenCalledBefore(commit);
        expect(reconcileBodyScrollLock).toHaveBeenCalledTimes(1);
    });

    it('unfreeze تحت الغطاء ثم conceal ثم إزالة العلم', () => {
        const dash = document.createElement('div');
        dash.setAttribute('data-hami-lawyer-dashboard', '');
        const grid = document.createElement('div');
        grid.dataset.testid = 'home-main-grid';
        dash.appendChild(grid);
        document.body.appendChild(dash);
        document.documentElement.setAttribute('data-hami-settings-open', '1');

        const conceal = vi.fn(() => {
            expect(document.documentElement.getAttribute(OVERLAY_UNFREEZE_ATTR)).toBe('1');
            document.documentElement.removeAttribute('data-hami-settings-open');
        });
        const commit = vi.fn();
        executeOverlayCoveredUnfreezeClose({ conceal, commit });

        expect(conceal).toHaveBeenCalledBefore(commit);
        expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
        expect(reconcileBodyScrollLock).toHaveBeenCalledTimes(1);
        clearOverlayCoveredUnfreeze();
    });

    it('إغلاق الإعدادات على الأصلي يتجاوز unfreeze التخطيط', () => {
        document.documentElement.setAttribute('data-hami-native', '1');
        const conceal = vi.fn(() => {
            expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
        });
        const commit = vi.fn();
        executeSettingsOverlayClose({ conceal, commit });
        expect(conceal).toHaveBeenCalledBefore(commit);
        expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
        expect(reconcileBodyScrollLock).toHaveBeenCalledTimes(1);
        document.documentElement.removeAttribute('data-hami-native');
    });

    it('إغلاق الإعدادات لا يعيد تخطيط اللوحة حتى على الويب', () => {
        document.documentElement.removeAttribute('data-hami-native');
        const conceal = vi.fn(() => {
            expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
        });
        const commit = vi.fn();
        executeSettingsOverlayClose({ conceal, commit });
        expect(conceal).toHaveBeenCalledBefore(commit);
        expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
        expect(reconcileBodyScrollLock).toHaveBeenCalledTimes(1);
    });

    it('إغلاق الإشعارات لا يعيد تخطيط اللوحة حتى على الويب', () => {
        document.documentElement.removeAttribute('data-hami-native');
        const conceal = vi.fn(() => {
            expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
        });
        const commit = vi.fn();
        executeNotificationsOverlayClose({ conceal, commit });
        expect(conceal).toHaveBeenCalledBefore(commit);
        expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
        expect(reconcileBodyScrollLock).toHaveBeenCalledTimes(1);
    });

    it('إغلاق الإشعارات على الأصلي يتجاوز unfreeze التخطيط', () => {
        document.documentElement.setAttribute('data-hami-native', '1');
        const conceal = vi.fn(() => {
            expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
        });
        const commit = vi.fn();
        executeNotificationsOverlayClose({ conceal, commit });
        expect(conceal).toHaveBeenCalledBefore(commit);
        expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
        expect(reconcileBodyScrollLock).toHaveBeenCalledTimes(1);
    });

    it('إغلاق البحث على الأصلي يتجاوز unfreeze التخطيط', () => {
        document.documentElement.setAttribute('data-hami-native', '1');
        const conceal = vi.fn(() => {
            expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
        });
        const commit = vi.fn();
        executeGlobalSearchOverlayClose({ conceal, commit });
        expect(conceal).toHaveBeenCalledBefore(commit);
        expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
    });

    it('إغلاق الملف لا يعيد تخطيط اللوحة حتى على الويب', () => {
        document.documentElement.removeAttribute('data-hami-native');
        const conceal = vi.fn(() => {
            expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
        });
        const commit = vi.fn();
        executeProfileOverlayClose({ conceal, commit });
        expect(conceal).toHaveBeenCalledBefore(commit);
        expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
    });

    it('إغلاق الملف على الأصلي يتجاوز unfreeze التخطيط', () => {
        document.documentElement.setAttribute('data-hami-native', '1');
        const conceal = vi.fn(() => {
            expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
        });
        const commit = vi.fn();
        executeProfileOverlayClose({ conceal, commit });
        expect(conceal).toHaveBeenCalledBefore(commit);
        expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
    });

    it('إغلاق التقويم على الأصلي يتجاوز unfreeze التخطيط', () => {
        document.documentElement.setAttribute('data-hami-native', '1');
        const conceal = vi.fn(() => {
            expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
        });
        const commit = vi.fn();
        executeScheduleOverlayClose({ conceal, commit });
        expect(conceal).toHaveBeenCalledBefore(commit);
        expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
    });

    it('إغلاق المعاملات على الأصلي يتجاوز unfreeze التخطيط', () => {
        document.documentElement.setAttribute('data-hami-native', '1');
        const conceal = vi.fn(() => {
            expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
        });
        const commit = vi.fn();
        executeTransactionsOverlayClose({ conceal, commit });
        expect(conceal).toHaveBeenCalledBefore(commit);
        expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
    });

    it('إغلاق ستارة الميدان على الأصلي يتجاوز unfreeze التخطيط', () => {
        document.documentElement.setAttribute('data-hami-native', '1');
        const conceal = vi.fn(() => {
            expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
        });
        const commit = vi.fn();
        executeFieldTasksOverlayClose({ conceal, commit });
        expect(conceal).toHaveBeenCalledBefore(commit);
        expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
    });

    it('إغلاق أجندة المهام على الأصلي يتجاوز unfreeze التخطيط', () => {
        document.documentElement.setAttribute('data-hami-native', '1');
        const conceal = vi.fn(() => {
            expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
        });
        const commit = vi.fn();
        executeTasksManagerOverlayClose({ conceal, commit });
        expect(conceal).toHaveBeenCalledBefore(commit);
        expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
    });

    it('إغلاق المستودع على الأصلي يتجاوز unfreeze التخطيط', () => {
        document.documentElement.setAttribute('data-hami-native', '1');
        const conceal = vi.fn(() => {
            expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
        });
        const commit = vi.fn();
        executeRepositoryOverlayClose({ conceal, commit });
        expect(conceal).toHaveBeenCalledBefore(commit);
        expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
    });

    it('إغلاق المنتدى على الأصلي يتجاوز unfreeze التخطيط', () => {
        document.documentElement.setAttribute('data-hami-native', '1');
        const conceal = vi.fn(() => {
            expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
        });
        const commit = vi.fn();
        executeForumOverlayClose({ conceal, commit });
        expect(conceal).toHaveBeenCalledBefore(commit);
        expect(document.documentElement.hasAttribute(OVERLAY_UNFREEZE_ATTR)).toBe(false);
    });
});
