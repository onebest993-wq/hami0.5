import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const isCapacitorNativePlatform = vi.fn();

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => isCapacitorNativePlatform(),
}));

import { bindPrivacyBlur } from '@/app/runtime/privacyBlurRuntime';

describe('privacyBlurRuntime', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        document.body.innerHTML = '';
        document.body.style.filter = '';
        delete document.documentElement.dataset.hamiPrivacyShield;
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    });

    afterEach(() => {
        vi.useRealTimers();
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    });

    it('يُطبّق blur على الويب عند إخفاء التبويب', () => {
        isCapacitorNativePlatform.mockReturnValue(false);
        const unbind = bindPrivacyBlur(true);

        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(document.body.style.filter).toContain('blur');

        unbind();
        expect(document.body.style.filter).toBe('none');
    });

    it('يُظهر درع الخصوصية على الأصلي بعد تأخير قصير عند الخلفية', () => {
        isCapacitorNativePlatform.mockReturnValue(true);
        const unbind = bindPrivacyBlur(true);

        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(document.getElementById('hami-privacy-blur-shield')).toBeNull();

        vi.advanceTimersByTime(130);
        const shield = document.getElementById('hami-privacy-blur-shield');
        expect(shield).toBeTruthy();
        expect(shield?.style.visibility).toBe('visible');
        expect(document.documentElement.dataset.hamiPrivacyShield).toBe('1');

        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(shield?.style.visibility).toBe('hidden');

        unbind();
        expect(document.getElementById('hami-privacy-blur-shield')).toBeTruthy();
    });
});
