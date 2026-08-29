import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';

const nativePlatform = vi.hoisted(() => ({ native: false }));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => nativePlatform.native,
    getCapacitorPlatformId: () => (nativePlatform.native ? 'android' : 'web'),
    isAndroidNativeShell: () => nativePlatform.native,
}));

vi.mock('@/app/runtime/nativeCapacitorBoot', () => ({
    whenNativeCapacitorBootComplete: () => Promise.resolve(),
    bootNativeCapacitorShell: () => Promise.resolve(),
}));

vi.mock('@/app/hooks/useAutoSave', () => ({
    useAutoSave: () => undefined,
}));

vi.mock('@/app/runtime/privacyBlurRuntime', () => ({
    bindPrivacyBlur: (enabled: boolean) => {
        if (nativePlatform.native) {
            document.body.style.filter = 'none';
            return () => undefined;
        }
        const onVis = () => {
            if (!enabled || !document.hidden) {
                document.body.style.filter = 'none';
                return;
            }
            document.body.style.filter = 'blur(14px)';
        };
        document.addEventListener('visibilitychange', onVis);
        onVis();
        return () => {
            document.removeEventListener('visibilitychange', onVis);
            document.body.style.filter = 'none';
        };
    },
    dismissNativePrivacyShieldImmediately: vi.fn(),
}));

import { LawyerSettingsProvider } from '../LawyerSettingsContext';

describe('LawyerSettingsProvider privacy blur (mobile)', () => {
    beforeEach(() => {
        nativePlatform.native = false;
        document.body.style.filter = 'none';
    });

    afterEach(() => {
        document.body.style.filter = 'none';
        vi.restoreAllMocks();
    });

    it('يُطبّق blur على body عند إخفاء الصفحة مع privacyBlur الافتراضي', async () => {
        render(
            <LawyerSettingsProvider>
                <div data-testid="child" />
            </LawyerSettingsProvider>,
        );

        await act(async () => {
            await Promise.resolve();
        });

        Object.defineProperty(document, 'hidden', {
            configurable: true,
            get: () => true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(document.body.style.filter).toBe('blur(14px)');

        Object.defineProperty(document, 'hidden', {
            configurable: true,
            get: () => false,
        });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(document.body.style.filter).toBe('none');
    });

    it('لا يطبّق CSS blur على Capacitor — privacy-screen يكفي', async () => {
        nativePlatform.native = true;
        render(
            <LawyerSettingsProvider>
                <div data-testid="child" />
            </LawyerSettingsProvider>,
        );

        await act(async () => {
            await Promise.resolve();
        });

        Object.defineProperty(document, 'hidden', {
            configurable: true,
            get: () => true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(document.body.style.filter).toBe('none');
    });
});
