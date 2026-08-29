import { describe, expect, it } from 'vitest';
import {
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

    it('isNativeShellStampedOnDom يقرأ ختم html فقط', () => {
        document.documentElement.removeAttribute('data-hami-native');
        expect(isNativeShellStampedOnDom()).toBe(false);
        document.documentElement.dataset.hamiNative = '1';
        expect(isNativeShellStampedOnDom()).toBe(true);
        document.documentElement.dataset.hamiNative = '0';
        expect(isNativeShellStampedOnDom()).toBe(false);
        document.documentElement.removeAttribute('data-hami-native');
    });
});
