import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

const nativePlatform = vi.hoisted(() => ({ native: false }));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => nativePlatform.native,
}));

vi.mock('@/app/hooks/useAutoSave', () => ({
    useAutoSave: () => undefined,
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

    it('يُطبّق blur على body عند إخفاء الصفحة مع privacyBlur الافتراضي', () => {
        render(
            <LawyerSettingsProvider>
                <div data-testid="child" />
            </LawyerSettingsProvider>,
        );

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

    it('لا يطبّق CSS blur على Capacitor — privacy-screen يكفي', () => {
        nativePlatform.native = true;
        render(
            <LawyerSettingsProvider>
                <div data-testid="child" />
            </LawyerSettingsProvider>,
        );

        Object.defineProperty(document, 'hidden', {
            configurable: true,
            get: () => true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(document.body.style.filter).toBe('none');
    });
});
