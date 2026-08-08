import { beforeEach, describe, expect, it } from 'vitest';
import {
    isAppLockSnappedOpen,
    snapAppLockClose,
    snapAppLockOpen,
} from '@/app/runtime/appLockInstantPaint';

describe('appLockInstantPaint', () => {
    beforeEach(() => {
        snapAppLockClose();
    });

    it('يفتح ويغلق علم html', () => {
        expect(isAppLockSnappedOpen()).toBe(false);
        snapAppLockOpen();
        expect(isAppLockSnappedOpen()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-app-locked')).toBe('1');
        snapAppLockClose();
        expect(isAppLockSnappedOpen()).toBe(false);
    });
});
