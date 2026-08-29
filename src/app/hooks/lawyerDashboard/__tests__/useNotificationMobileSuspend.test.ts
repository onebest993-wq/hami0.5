import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNotificationMobileSuspend } from '@/app/hooks/lawyerDashboard/useNotificationMobileSuspend';

describe('useNotificationMobileSuspend', () => {
    it('يزيل التركيز عند pagehide و visibilitychange وحالة التطبيق', () => {
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();
        expect(document.activeElement).toBe(input);

        renderHook(() => useNotificationMobileSuspend(true));

        window.dispatchEvent(new Event('pagehide'));
        expect(document.activeElement).not.toBe(input);

        input.focus();
        expect(document.activeElement).toBe(input);
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(document.activeElement).not.toBe(input);

        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        input.focus();
        expect(document.activeElement).toBe(input);
        window.dispatchEvent(
            new CustomEvent('hami-native-app-state', { detail: { isActive: false } }),
        );
        expect(document.activeElement).not.toBe(input);

        input.remove();
    });
});
