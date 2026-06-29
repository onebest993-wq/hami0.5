import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { LawyerSettingsProvider } from '../LawyerSettingsContext';

vi.mock('@/app/hooks/useAutoSave', () => ({
    useAutoSave: () => undefined,
}));

describe('LawyerSettingsProvider privacy blur (mobile)', () => {
    beforeEach(() => {
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
});
