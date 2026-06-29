import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
    getCapacitorPlatformId,
    isCapacitorNativePlatform,
    readNativePlatformFromDom,
} from '@/app/runtime/nativePlatform';
import { applyCapacitorShellBoot } from '@/app/runtime/capacitorShellBoot';

describe('nativePlatform', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-hami-native');
        document.documentElement.removeAttribute('data-hami-platform');
        document.documentElement.classList.remove('hami-native-shell');
        delete (window as Window & { Capacitor?: unknown }).Capacitor;
    });

    afterEach(() => {
        delete (window as Window & { Capacitor?: unknown }).Capacitor;
    });

    it('reads native platform from DOM dataset', () => {
        document.documentElement.dataset.hamiNative = '1';
        document.documentElement.dataset.hamiPlatform = 'ios';
        expect(readNativePlatformFromDom()).toBe('ios');
        expect(isCapacitorNativePlatform()).toBe(true);
    });

    it('detects Capacitor global when DOM unset', () => {
        (window as Window & { Capacitor?: { isNativePlatform: () => boolean; getPlatform: () => string } }).Capacitor =
            {
                isNativePlatform: () => true,
                getPlatform: () => 'android',
            };
        expect(isCapacitorNativePlatform()).toBe(true);
        expect(getCapacitorPlatformId()).toBe('android');
    });
});

describe('applyCapacitorShellBoot', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-hami-native');
        document.documentElement.removeAttribute('data-hami-platform');
        document.documentElement.classList.remove('hami-native-shell');
        delete (window as Window & { Capacitor?: unknown }).Capacitor;
    });

    it('marks document root on native Capacitor', () => {
        (window as Window & { Capacitor?: { isNativePlatform: () => boolean; getPlatform: () => string } }).Capacitor =
            {
                isNativePlatform: () => true,
                getPlatform: () => 'ios',
            };
        applyCapacitorShellBoot();
        expect(document.documentElement.dataset.hamiNative).toBe('1');
        expect(document.documentElement.dataset.hamiPlatform).toBe('ios');
        expect(document.documentElement.classList.contains('hami-native-shell')).toBe(true);
    });

    it('marks web when not native', () => {
        applyCapacitorShellBoot();
        expect(document.documentElement.dataset.hamiNative).toBe('0');
        expect(document.documentElement.dataset.hamiPlatform).toBe('web');
    });
});
