import { afterEach, describe, expect, it } from 'vitest';
import {
    isBootTypographyLocked,
    lockBootTypographyVars,
} from '@/app/bootstrap/bootTypographyLock';

describe('bootTypographyLock', () => {
    afterEach(() => {
        document.documentElement.classList.remove('hami-boot-static-active');
        document.documentElement.removeAttribute('data-hami-auth-gate-active');
        document.documentElement.style.removeProperty('--hami-font-size');
        document.documentElement.style.removeProperty('--hami-user-font-scale');
    });

    it('يقفل أثناء طبقة الإقلاع', () => {
        document.documentElement.classList.add('hami-boot-static-active');
        expect(isBootTypographyLocked()).toBe(true);
    });

    it('يقفل أثناء بوابة الدخول', () => {
        document.documentElement.setAttribute('data-hami-auth-gate-active', '1');
        expect(isBootTypographyLocked()).toBe(true);
    });

    it('لا يقفل خارج المسارين', () => {
        expect(isBootTypographyLocked()).toBe(false);
    });

    it('lockBootTypographyVars يثبّت متغيرات القراءة على 16px', () => {
        lockBootTypographyVars();
        expect(document.documentElement.style.getPropertyValue('--hami-font-size')).toBe('16px');
        expect(document.documentElement.style.getPropertyValue('--hami-user-font-scale')).toBe('1');
    });
});
