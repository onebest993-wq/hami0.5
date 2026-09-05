import { describe, expect, it } from 'vitest';
import {
    isMeteredOrSlowNetwork,
    isModestDevice,
    isNativeShellStampedOnDom,
    normalizeLitePerformanceMode,
    resolveLitePerformance,
} from '../devicePerformanceTier';

describe('devicePerformanceTier', () => {
    it('normalizeLitePerformanceMode يعيد auto للقيم غير المعروفة', () => {
        expect(normalizeLitePerformanceMode('auto')).toBe('auto');
        expect(normalizeLitePerformanceMode('on')).toBe('on');
        expect(normalizeLitePerformanceMode('off')).toBe('off');
        expect(normalizeLitePerformanceMode(undefined)).toBe('auto');
        expect(normalizeLitePerformanceMode('bogus')).toBe('auto');
    });

    it('resolveLitePerformance يحترم on/off', () => {
        expect(resolveLitePerformance('on')).toBe(true);
        expect(resolveLitePerformance('off')).toBe(false);
    });

    it('isModestDevice عند ذاكرة ≤4', () => {
        Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 2 });
        Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 8 });
        expect(isModestDevice()).toBe(true);
    });

    it('جهاز قوي بذاكرة ونوى كافية ليس modest', () => {
        Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 8 });
        Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 8 });
        Object.defineProperty(navigator, 'connection', {
            configurable: true,
            value: { saveData: false, effectiveType: '4g' },
        });
        const mm = window.matchMedia;
        window.matchMedia = ((q: string) =>
            ({
                matches: false,
                media: q,
                addEventListener: () => undefined,
                removeEventListener: () => undefined,
            })) as typeof window.matchMedia;
        expect(isModestDevice()).toBe(false);
        window.matchMedia = mm;
    });

    it('isNativeShellStampedOnDom يقرأ ختم html فقط', () => {
        document.documentElement.removeAttribute('data-hami-native');
        expect(isNativeShellStampedOnDom()).toBe(false);
        document.documentElement.dataset.hamiNative = '1';
        expect(isNativeShellStampedOnDom()).toBe(true);
        document.documentElement.dataset.hamiNative = '0';
        expect(isNativeShellStampedOnDom()).toBe(false);
        document.documentElement.removeAttribute('data-hami-native');
    });

    it('isMeteredOrSlowNetwork يقرأ saveData و2G/3G لا 4G', () => {
        Object.defineProperty(navigator, 'connection', {
            configurable: true,
            value: { saveData: false, effectiveType: '4g' },
        });
        expect(isMeteredOrSlowNetwork()).toBe(false);

        Object.defineProperty(navigator, 'connection', {
            configurable: true,
            value: { saveData: true, effectiveType: '4g' },
        });
        expect(isMeteredOrSlowNetwork()).toBe(true);

        Object.defineProperty(navigator, 'connection', {
            configurable: true,
            value: { saveData: false, effectiveType: '3g' },
        });
        expect(isMeteredOrSlowNetwork()).toBe(true);

        Object.defineProperty(navigator, 'connection', {
            configurable: true,
            value: { saveData: false, effectiveType: '2g' },
        });
        expect(isMeteredOrSlowNetwork()).toBe(true);
    });
});
